from datetime import datetime, time, timedelta

import pytest
from django.utils import timezone

from accounts.models import FarmerStatus
from markets.models import FarmerMarket, Market, MarketOperatingDay, PickupSlot
from orders.models import Order, OrderStatus

MONDAY = 1
WEDNESDAY = 3
SATURDAY = 6


@pytest.fixture
def market(db):
    created = Market.objects.create(
        name="Central Market",
        address="1 Market Street",
        latitude="10.762622",
        longitude="106.660172",
        open_time=time(6, 0),
        close_time=time(12, 0),
    )
    MarketOperatingDay.objects.bulk_create(
        [
            MarketOperatingDay(market=created, day_of_week=MONDAY),
            MarketOperatingDay(market=created, day_of_week=WEDNESDAY),
        ]
    )
    return created


@pytest.fixture
def approved_farmer(farmer_user):
    profile = farmer_user.farmer_profile
    profile.status = FarmerStatus.APPROVED
    profile.save(update_fields=["status"])
    return profile


@pytest.fixture
def farmer_market(market, approved_farmer):
    return FarmerMarket.objects.create(
        farmer=approved_farmer, market=market, stall_label="Row B, Stall 12"
    )


@pytest.fixture
def make_slot(farmer_market):
    def _make(*, day_of_week: int, start: time, end: time) -> PickupSlot:
        return PickupSlot.objects.create(
            farmer_market=farmer_market, day_of_week=day_of_week, start_time=start, end_time=end
        )

    return _make


@pytest.fixture
def make_order(market, approved_farmer, customer_user):
    def _make(*, pickup_date, status=OrderStatus.PLACED) -> Order:
        start = timezone.make_aware(datetime.combine(pickup_date, time(8, 0)))
        return Order.objects.create(
            customer=customer_user,
            farmer=approved_farmer,
            market=market,
            pickup_date=pickup_date,
            pickup_start_at=start,
            pickup_end_at=start + timedelta(hours=2),
            cutoff_at=start - timedelta(hours=12),
            status=status,
            total_amount="25.00",
        )

    return _make
