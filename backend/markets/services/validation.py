from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.utils import timezone

from marketlink_core.exceptions import ErrorCode, UnprocessableEntityError
from markets.models import FarmerClosure, MarketClosure, MarketOperatingDay, PickupSlot

BOOKING_HORIZON_DAYS = 7


@dataclass(frozen=True)
class ValidatedPickupSchedule:
    slot: PickupSlot
    start_at: datetime
    end_at: datetime
    cutoff_at: datetime


def validate_pickup_date(
    *,
    farmer_id: int,
    market_id: int,
    pickup_date: date,
    pickup_slot_id: int,
) -> ValidatedPickupSchedule:
    now = timezone.now()
    current_tz = timezone.get_current_timezone()
    today = timezone.localtime(now).date()
    max_booking_date = today + timedelta(days=BOOKING_HORIZON_DAYS)

    if pickup_date < today or pickup_date > max_booking_date:
        raise UnprocessableEntityError(
            f"Pickup date must be between {today.strftime('%Y-%m-%d')} and {max_booking_date.strftime('%Y-%m-%d')}.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    is_market_operating = MarketOperatingDay.objects.filter(
        market_id=market_id,
        market__is_active=True,
        day_of_week=pickup_date.isoweekday(),
    ).exists()
    if not is_market_operating:
        raise UnprocessableEntityError(
            "The market is not operating on the selected pickup date.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    if MarketClosure.objects.filter(
        market_id=market_id,
        start_date__lte=pickup_date,
        end_date__gte=pickup_date,
    ).exists():
        raise UnprocessableEntityError(
            "The market is closed on the selected pickup date.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    if FarmerClosure.objects.filter(
        farmer_id=farmer_id,
        start_date__lte=pickup_date,
        end_date__gte=pickup_date,
    ).exists():
        raise UnprocessableEntityError(
            "The stall is closed on the selected pickup date.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    try:
        slot = PickupSlot.objects.select_related("farmer_market__farmer").get(
            id=pickup_slot_id,
            farmer_market__farmer_id=farmer_id,
            farmer_market__market_id=market_id,
        )
    except PickupSlot.DoesNotExist:
        raise UnprocessableEntityError(
            "The selected pickup slot is not available for this stall at this market.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    if not slot.is_active:
        raise UnprocessableEntityError(
            "The selected pickup slot is not active.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    if pickup_date.isoweekday() != slot.day_of_week:
        raise UnprocessableEntityError(
            f"The pickup date is not a {slot.get_day_of_week_display()}.",
            code=ErrorCode.SLOT_NOT_AVAILABLE,
        )

    start_at = timezone.make_aware(datetime.combine(pickup_date, slot.start_time), current_tz)
    end_at = timezone.make_aware(datetime.combine(pickup_date, slot.end_time), current_tz)
    cutoff_hours = slot.farmer_market.farmer.order_cutoff_hours
    cutoff_at = start_at - timedelta(hours=cutoff_hours)

    if now >= cutoff_at:
        raise UnprocessableEntityError(
            "The cutoff time for this pickup slot has already passed.",
            code=ErrorCode.CUTOFF_PASSED,
        )

    return ValidatedPickupSchedule(
        slot=slot,
        start_at=start_at,
        end_at=end_at,
        cutoff_at=cutoff_at,
    )
