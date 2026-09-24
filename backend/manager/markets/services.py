"""
Module: manager.markets.services
Description: Market management for admins (FR-53, AD-14 -> AD-17, D-012, D-017, U-04).
"""

from datetime import time

from django.db import transaction
from django.db.models import Count, Prefetch, Q, QuerySet

from accounts.models import FarmerStatus
from core.exceptions import UnprocessableEntityError
from markets.models import Market, MarketOperatingDay, PickupSlot
from orders.models import OPEN_STATUSES

# Farmers counted on a market are the ones the public sees (Pass 4B §6.2).
SELLING_FARMER = Q(
    farmer_markets__farmer__status=FarmerStatus.APPROVED,
    farmer_markets__farmer__user__is_active=True,
)


def admin_markets() -> QuerySet[Market]:
    """Every market, active or not, with the counts MarketAdmin shows."""
    return (
        Market.objects
        .annotate(
            # Two joins in one query multiply rows, so both counts are distinct.
            farmer_count=Count('farmer_markets', filter=SELLING_FARMER, distinct=True),
            open_order_count=Count('orders', filter=Q(orders__status__in=OPEN_STATUSES), distinct=True),
        )
        .prefetch_related(Prefetch('operating_days', queryset=MarketOperatingDay.objects.order_by('day_of_week')))
        .order_by('name')
    )


def _slots_outside(*, market_id: int, days: set[int], open_time: time, close_time: time) -> int:
    """Pickup slots at this market that the new days or hours would leave outside (U-04).

    Inactive slots count too: a farmer can switch one back on at any time.
    """
    return (
        PickupSlot.objects
        .filter(farmer_market__market_id=market_id)
        .filter(~Q(day_of_week__in=days) | Q(start_time__lt=open_time) | Q(end_time__gt=close_time))
        .count()
    )


def create_market(*, operating_days: list[int], **fields) -> Market:
    with transaction.atomic():
        market = Market.objects.create(**fields)
        MarketOperatingDay.objects.bulk_create(
            MarketOperatingDay(market=market, day_of_week=day) for day in sorted(set(operating_days))
        )
    return market


def update_market(*, market_id: int, operating_days: list[int] | None = None, **fields) -> Market:
    """Apply a partial update. Refused with 422 RESOURCE_IN_USE if farmers' slots would fall outside.

    The market row is locked so a farmer saving a slot against the old days or hours
    (which reads this row) cannot slip in between the check and the update.
    """
    old_image = None
    with transaction.atomic():
        market = Market.objects.select_for_update(of=('self',)).get(id=market_id)
        current_days = set(market.operating_days.values_list('day_of_week', flat=True))
        new_days = set(operating_days) if operating_days is not None else current_days
        open_time = fields.get('open_time', market.open_time)
        close_time = fields.get('close_time', market.close_time)

        if new_days != current_days or open_time > market.open_time or close_time < market.close_time:
            affected = _slots_outside(
                market_id=market_id, days=new_days, open_time=open_time, close_time=close_time,
            )
            if affected:
                raise UnprocessableEntityError(
                    f'Có {affected} khung nhận hàng của nông dân nằm ngoài ngày hoặc giờ họp mới. '
                    'Vui lòng yêu cầu nông dân điều chỉnh khung giờ trước.',
                    code='RESOURCE_IN_USE',
                    errors={'non_field_errors': [f'{affected} pickup slots fall outside the new schedule']},
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

        if old_image and old_image.name != getattr(market.image, 'name', None):
            # Remove the replaced file only once the new row is committed.
            transaction.on_commit(lambda: old_image.storage.delete(old_image.name))
    return market


def set_market_active(*, market_id: int, is_active: bool) -> None:
    """Soft remove or restore (D-017). Open orders keep their snapshot and are not touched."""
    market = Market.objects.get(id=market_id)
    market.is_active = is_active
    market.save(update_fields=['is_active', 'updated_at'])
