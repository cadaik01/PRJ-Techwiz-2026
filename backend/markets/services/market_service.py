from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction

from marketlink_core.exceptions import ErrorCode, UnprocessableEntityError
from marketlink_core.history import save_with_history
from markets.models import Market, MarketOperatingDay, PickupSlot
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import OPEN_STATUSES

SCHEDULE_FIELDS = ("operating_days", "open_time", "close_time")


def _replace_operating_days(*, market: Market, days: list[int]) -> None:
    MarketOperatingDay.objects.filter(market=market).delete()
    MarketOperatingDay.objects.bulk_create(
        [MarketOperatingDay(market=market, day_of_week=day) for day in sorted(set(days))]
    )


@transaction.atomic
def create_market(*, validated: dict[str, Any]) -> Market:
    days = validated.pop("operating_days")
    market = Market.objects.create(**validated)
    _replace_operating_days(market=market, days=days)
    return market


# D-022: slots outside the new schedule switch off; placed orders keep their snapshot (D-007).
@transaction.atomic
def update_market(*, market_id: int, validated: dict[str, Any]) -> tuple[Market, int]:
    # Lock order fixed by §5: markets, then pickup_slots by id, to stay deadlock-free.
    market = Market.objects.select_for_update().get(pk=market_id)
    reschedules = any(field in validated for field in SCHEDULE_FIELDS)
    days = validated.pop("operating_days", None)

    for field, value in validated.items():
        setattr(market, field, value)
    market.save()

    if days is not None:
        _replace_operating_days(market=market, days=days)

    if not reschedules:
        return market, 0

    current_days = set(
        MarketOperatingDay.objects.filter(market=market).values_list("day_of_week", flat=True)
    )
    # Evaluated immediately so the lock is actually taken; of=("self",) keeps the join
    # tables out of the lock.
    slots = list(
        PickupSlot.objects.filter(farmer_market__market_id=market_id, is_active=True)
        .select_related("farmer_market")
        .order_by("id")
        .select_for_update(of=("self",))
    )
    outside = [
        slot
        for slot in slots
        if slot.day_of_week not in current_days
        or slot.start_time < market.open_time
        or slot.end_time > market.close_time
    ]
    if not outside:
        return market, 0

    # Row by row, never QuerySet.update(): the audit trail of pickup_slots has to record every
    # slot the admin switched off, and update() writes no history row (v1.8, AD-16).
    for slot in outside:
        slot.is_active = False
        save_with_history(
            slot,
            update_fields=["is_active", "updated_at"],
            reason=f"Market #{market_id} schedule changed by Admin (AD-16)",
        )

    slots_per_farmer: dict[int, int] = {}
    for slot in outside:
        farmer_id = slot.farmer_market.farmer_id
        slots_per_farmer[farmer_id] = slots_per_farmer.get(farmer_id, 0) + 1

    # farmer_profiles is keyed by user_id, so the farmer ids are already user ids.
    recipients = get_user_model().objects.in_bulk(sorted(slots_per_farmer))

    # notify() writes its row in this transaction and defers delivery to on_commit, so a
    # rollback leaves no notification behind and nobody is told before the change lands.
    for farmer_id, slot_count in sorted(slots_per_farmer.items()):
        notify(
            recipient=recipients[farmer_id],
            event_type=NotificationType.MARKET_SCHEDULE_CHANGED,
            context={"market_name": market.name, "slot_count": slot_count},
        )

    return market, len(outside)


# D-022 blocks this while orders are open; slots stay untouched so activate_market restores them.
@transaction.atomic
def deactivate_market(*, market_id: int) -> Market:
    market = Market.objects.select_for_update().get(pk=market_id)
    open_orders = market.orders.filter(status__in=OPEN_STATUSES).count()
    if open_orders:
        raise UnprocessableEntityError(
            f"{open_orders} open orders remain at this market.",
            code=ErrorCode.RESOURCE_IN_USE,
            errors={"open_order_count": [str(open_orders)]},
        )
    market.is_active = False
    market.save(update_fields=["is_active", "updated_at"])
    return market


@transaction.atomic
def activate_market(*, market_id: int) -> Market:
    market = Market.objects.select_for_update().get(pk=market_id)
    market.is_active = True
    market.save(update_fields=["is_active", "updated_at"])
    return market
