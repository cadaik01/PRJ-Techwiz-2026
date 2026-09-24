"""Database-level constraints from MarketLink Pass 4A §3 and §4.

Each test writes a row that bypasses model validation, so it checks what MySQL itself
enforces rather than what a serializer would catch first.
"""

from datetime import datetime, time, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import FarmerProfile, Role
from catalog.models import Category, Product, Unit
from conftest import PASSWORD
from marketlink_core.policies.roles import RoleCode
from markets.models import Market
from orders.models import Order, OrderItem
from reviews.models import FarmerReview

User = get_user_model()


def _rejects(create):
    with pytest.raises(IntegrityError), transaction.atomic():
        create()


@pytest.fixture
def farmer(db):
    role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Farmer'})[0]
    user = User.objects.create_user(email='farmer@test.com', password=PASSWORD, role=role)
    return FarmerProfile.objects.create(
        user=user, stall_name='Rau Sạch', contact_person='Bà Tư', phone='0907654321', address='Q1',
    )


@pytest.fixture
def market(db):
    return Market.objects.create(
        name='Chợ Bến Thành', address='Q1', latitude=Decimal('10.772450'), longitude=Decimal('106.698060'),
        open_time=time(5), close_time=time(18),
    )


@pytest.fixture
def product(farmer):
    category = Category.objects.create(name='Rau lá')
    return Product.objects.create(farmer=farmer, category=category, name='Cải ngọt', price=15000, unit=Unit.BUNCH)


@pytest.fixture
def order(user, farmer, market):
    start = timezone.make_aware(datetime(2026, 10, 3, 7))
    return Order.objects.create(
        customer=user, farmer=farmer, market=market, pickup_date=start.date(),
        pickup_start_at=start, pickup_end_at=start + timedelta(hours=1),
        cutoff_at=start - timedelta(hours=12), total_amount=30000,
    )


def test_product_price_below_1000_is_rejected(product):
    _rejects(lambda: Product.objects.filter(pk=product.pk).update(price=999))


def test_farmer_coordinates_must_be_set_together(farmer):
    _rejects(lambda: FarmerProfile.objects.filter(pk=farmer.pk).update(latitude=Decimal('10.1')))


def test_farmer_cutoff_hours_capped_at_72(farmer):
    _rejects(lambda: FarmerProfile.objects.filter(pk=farmer.pk).update(order_cutoff_hours=73))


def test_market_must_close_after_it_opens(market):
    _rejects(lambda: Market.objects.filter(pk=market.pk).update(close_time=time(4)))


def test_market_name_is_case_insensitive_but_accent_sensitive(market):
    Market.objects.create(
        name='Cho Ben Thanh', address='Q1', latitude=0, longitude=0, open_time=time(5), close_time=time(18),
    )
    _rejects(lambda: Market.objects.create(
        name='chợ bến thành', address='Q1', latitude=0, longitude=0, open_time=time(5), close_time=time(18),
    ))


def test_order_cutoff_cannot_be_after_pickup_start(order):
    _rejects(lambda: Order.objects.filter(pk=order.pk).update(cutoff_at=order.pickup_start_at + timedelta(minutes=1)))


def test_order_item_is_unique_per_product_and_quantity_at_least_one(order, product):
    item = dict(order=order, product=product, product_name=product.name, unit=product.unit, unit_price=15000)
    OrderItem.objects.create(**item, quantity=2, line_total=30000)

    _rejects(lambda: OrderItem.objects.create(**item, quantity=1, line_total=15000))
    _rejects(lambda: OrderItem.objects.filter(order=order).update(quantity=0))


def test_review_rating_is_between_1_and_5(order):
    _rejects(lambda: FarmerReview.objects.create(order=order, rating=6))
    FarmerReview.objects.create(order=order, rating=5)
    # One farmer review per order (D-016).
    _rejects(lambda: FarmerReview.objects.create(order=order, rating=4))
