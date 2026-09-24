"""
Module: manager.markets.services
Description: Market management for admins (FR-53, AD-14 -> AD-17, AD-31 -> AD-33,
             D-012, D-017, D-022, D-023).
"""

from collections import Counter
from datetime import date

from django.db import transaction
from django.db.models import Count, Prefetch, Q, QuerySet
from django.utils import timezone

from accounts.models import FarmerStatus
from manager.common.notify import notify_user
from marketlink_core.exceptions import BusinessValidationError, UnprocessableEntityError
from markets.models import Market, MarketClosure, MarketOperatingDay, PickupSlot
from markets.public.closures import upcoming_closures
from notifications.models import NotificationType
from orders.models import OPEN_STATUSES, Order

# Farmers counted on a market are the ones the public sees (Pass 4B §6.2).
SELLING_FARMER = Q(
    farmer_markets__farmer__status=FarmerStatus.APPROVED,
    farmer_markets__farmer__user__is_active=True,
)


def admin_markets() -> QuerySet[Market]:
    """Every market, active or not, with the counts and upcoming closures MarketAdmin shows."""
    return (
        Market.objects
        .annotate(
            # Two joins in one query multiply rows, so both counts are distinct.
            farmer_count=Count('farmer_markets', filter=SELLING_FARMER, distinct=True),
            open_order_count=Count('orders', filter=Q(orders__status__in=OPEN_STATUSES), distinct=True),
        )
        .prefetch_related(
            Prefetch('operating_days', queryset=MarketOperatingDay.objects.order_by('day_of_week')),
            upcoming_closures('closures', MarketClosure),
        )
        .order_by('name')
    )


def create_market(*, operating_days: list[int], **fields) -> Market:
    with transaction.atomic():
        market = Market.objects.create(**fields)
        MarketOperatingDay.objects.bulk_create(
            MarketOperatingDay(market=market, day_of_week=day) for day in sorted(set(operating_days))
        )
    return market


def _notify_schedule_change(market: Market, slots_per_farmer: Counter) -> None:
    """MARKET_SCHEDULE_CHANGED, in-app only, one per affected farmer (D-022)."""
    for farmer_market in (
        market.farmer_markets.select_related('farmer__user').filter(farmer_id__in=slots_per_farmer)
    ):
        count = slots_per_farmer[farmer_market.farmer_id]
        notify_user(
            recipient=farmer_market.farmer.user,
            type=NotificationType.MARKET_SCHEDULE_CHANGED,
            title=f'{market.name} changed its schedule',
            message=f'{count} of your pickup slots at {market.name} fall outside the new operating days '
                    'or hours and were switched off. Orders already placed are not affected.',
            target_url='/farmer/pickup-settings',
        )


def update_market(*, market_id: int, operating_days: list[int] | None = None, **fields) -> tuple[Market, int]:
    """Apply a partial update; return the market and how many pickup slots were switched off.

    A new schedule switches off the active slots it leaves outside (D-022). Lock order:
    the market row, then its pickup slots by id. Orders keep their snapshot (D-007).
    """
    old_image = None
    with transaction.atomic():
        market = Market.objects.select_for_update(of=('self',)).get(id=market_id)
        current_days = set(market.operating_days.values_list('day_of_week', flat=True))
        new_days = set(operating_days) if operating_days is not None else current_days
        schedule_changed = (
            new_days != current_days
            or fields.get('open_time', market.open_time) != market.open_time
            or fields.get('close_time', market.close_time) != market.close_time
        )

        if 'image' in fields and market.image:
            old_image = market.image
        for name, value in fields.items():
            setattr(market, name, value)
        market.save()

        if new_days != current_days:
            market.operating_days.exclude(day_of_week__in=new_days).delete()
            MarketOperatingDay.objects.bulk_create(
                MarketOperatingDay(market=market, day_of_week=day) for day in sorted(new_days - current_days)
            )

        switched_off = []
        if schedule_changed:
            for slot in (
                PickupSlot.objects.filter(farmer_market__market_id=market_id, is_active=True)
                .select_related('farmer_market').order_by('id').select_for_update(of=('self',))
            ):
                outside = (slot.day_of_week not in new_days or slot.start_time < market.open_time
                           or slot.end_time > market.close_time)
                if outside:
                    slot.is_active = False
                    slot.save(update_fields=['is_active', 'updated_at'])
                    switched_off.append(slot)
            _notify_schedule_change(market, Counter(slot.farmer_market.farmer_id for slot in switched_off))

        if old_image and old_image.name != getattr(market.image, 'name', None):
            # Remove the replaced file only once the new row is committed.
            transaction.on_commit(lambda: old_image.storage.delete(old_image.name))
    return market, len(switched_off)


def _open_orders(market_id: int, **pickup_range) -> QuerySet[Order]:
    return Order.objects.filter(market_id=market_id, status__in=OPEN_STATUSES, **pickup_range).order_by('id')


def set_market_active(*, market_id: int, is_active: bool) -> None:
    """Soft remove or restore (D-017). Deactivating is refused while orders are open there (D-022)."""
    with transaction.atomic():
        market = Market.objects.select_for_update(of=('self',)).get(id=market_id)
        if not is_active and (open_count := _open_orders(market_id).count()):
            raise UnprocessableEntityError(
                f'{open_count} open orders are still at this market. Close them before deactivating it.',
                code='RESOURCE_IN_USE', data={'open_orders': open_count},
            )
        market.is_active = is_active
        market.save(update_fields=['is_active', 'updated_at'])


def market_closures(*, market_id: int, include_past: bool) -> QuerySet[MarketClosure]:
    closures = MarketClosure.objects.filter(market_id=market_id)
    if not include_past:
        closures = closures.filter(end_date__gte=timezone.localdate())
    return closures.order_by('start_date')


def create_market_closure(
    *, market_id: int, start_date: date, end_date: date, reason: str | None = None,
) -> MarketClosure:
    """Add a temporary closure (D-023).

    The market row is locked so two admins cannot add overlapping closures at once.
    Open orders picked up inside the range block it: the farmers decline them first.
    """
    with transaction.atomic():
        Market.objects.select_for_update(of=('self',)).get(id=market_id)
        overlapping = MarketClosure.objects.filter(
            market_id=market_id, start_date__lte=end_date, end_date__gte=start_date,
        )
        if overlapping.exists():
            raise BusinessValidationError(
                'Invalid data', errors={'start_date': ['This period overlaps another closure of the market']},
            )
        open_ids = list(_open_orders(market_id, pickup_date__range=(start_date, end_date))
                        .values_list('id', flat=True))
        if open_ids:
            raise UnprocessableEntityError(
                f'{len(open_ids)} open orders are picked up in this period. '
                'The farmers must decline them before the market can close.',
                code='RESOURCE_IN_USE', data={'open_order_ids': open_ids},
            )
        return MarketClosure.objects.create(
            market_id=market_id, start_date=start_date, end_date=end_date, reason=reason,
        )
