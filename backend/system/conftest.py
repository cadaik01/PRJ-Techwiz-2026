from datetime import datetime, time, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.models import FarmerProfile, FarmerStatus, Role
from marketlink_core.policies.roles import RoleCode
from markets.models import Market
from orders.models import Order, OrderStatus

User = get_user_model()


@pytest.fixture
def approved_farmer(farmer_user):
    profile = farmer_user.farmer_profile
    profile.status = FarmerStatus.APPROVED
    profile.save(update_fields=["status"])
    return profile


@pytest.fixture
def make_farmer(db):
    def _make(*, email: str, stall_name: str, status: str = FarmerStatus.PENDING) -> FarmerProfile:
        user = User.objects.create_user(
            email=email, password="Str0ngPass123", role=Role.objects.get(code=RoleCode.FARMER)
        )
        return FarmerProfile.objects.create(
            user=user,
            stall_name=stall_name,
            contact_person="Contact Person",
            phone=f"09{user.pk:08d}",
            address="1 Farm Road",
            status=status,
        )

    return _make


@pytest.fixture
def market(db):
    return Market.objects.create(
        name="Central Market",
        address="1 Market Street",
        latitude="10.762622",
        longitude="106.660172",
        open_time=time(6, 0),
        close_time=time(12, 0),
    )


@pytest.fixture
def other_market(db):
    return Market.objects.create(
        name="Riverside Market",
        address="88 Riverside Road",
        latitude="10.8",
        longitude="106.7",
        open_time=time(6, 0),
        close_time=time(12, 0),
    )


@pytest.fixture
def make_order(customer_user, approved_farmer, market):
    def _make(
        *,
        pickup_date,
        status=OrderStatus.COMPLETED,
        total="10.00",
        order_market=None,
        farmer=None,
    ) -> Order:
        start = timezone.make_aware(datetime.combine(pickup_date, time(8, 0)))
        return Order.objects.create(
            customer=customer_user,
            farmer=farmer or approved_farmer,
            market=order_market or market,
            pickup_date=pickup_date,
            pickup_start_at=start,
            pickup_end_at=start + timedelta(hours=2),
            cutoff_at=start - timedelta(hours=12),
            status=status,
            total_amount=total,
        )

    return _make
