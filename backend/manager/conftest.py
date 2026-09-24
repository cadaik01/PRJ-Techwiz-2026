"""Factories shared by the manager tests: accounts, a market, products and orders."""

from datetime import datetime, time, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.models import CustomerProfile, FarmerProfile, FarmerStatus, Role
from catalog.models import Category, Product, Unit
from conftest import PASSWORD
from marketlink_core.policies.roles import RoleCode
from markets.models import Market
from orders.models import Order, OrderItem, OrderStatus

User = get_user_model()


@pytest.fixture(autouse=True)
def inline_email(settings):
    settings.EMAIL_ASYNC = False


def make_customer(email='khach@test.com', full_name='Nguyễn Văn A', phone='0901234567', **user_fields):
    role = Role.objects.get_or_create(code=RoleCode.CUSTOMER, defaults={'name': 'Customer'})[0]
    user = User.objects.create_user(email=email, password=PASSWORD, role=role, **user_fields)
    CustomerProfile.objects.create(user=user, full_name=full_name, phone=phone, address='12 Lê Lợi, Quận 1')
    return user


def make_farmer(email='farmer@test.com', stall_name='Rau Sạch Đà Lạt', status=FarmerStatus.APPROVED, **fields):
    role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Farmer'})[0]
    user = User.objects.create_user(email=email, password=PASSWORD, role=role)
    return FarmerProfile.objects.create(
        user=user, stall_name=stall_name, contact_person='Bà Tư', phone='0907654321',
        address='Chợ Bến Thành', status=status, **fields,
    )


def make_market(name='Chợ Bến Thành'):
    return Market.objects.create(
        name=name, address='Quận 1, TP.HCM', latitude=10.77245, longitude=106.69806,
        open_time=time(5), close_time=time(11),
    )


def make_product(farmer, name='Cải ngọt', stock=10, price=Decimal('15.00')):
    category = Category.objects.get_or_create(name='Rau lá')[0]
    return Product.objects.create(
        farmer=farmer, category=category, name=name, price=price, unit=Unit.BUNCH, stock_quantity=stock,
    )


def make_order(customer, farmer, market, lines, status=OrderStatus.PLACED, days_ahead=3):
    """`lines` is [(product, quantity)]; stock is assumed already deducted, as checkout does."""
    start = timezone.localtime().replace(hour=6, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
    total = sum(product.price * quantity for product, quantity in lines)
    order = Order.objects.create(
        customer=customer, farmer=farmer, market=market, pickup_date=start.date(), status=status,
        pickup_start_at=start, pickup_end_at=start + timedelta(hours=2), cutoff_at=start - timedelta(hours=12),
        total_amount=total,
    )
    for product, quantity in lines:
        OrderItem.objects.create(
            order=order, product=product, product_name=product.name, unit=product.unit,
            unit_price=product.price, quantity=quantity, line_total=product.price * quantity,
        )
    return order


def aware(*args):
    return timezone.make_aware(datetime(*args))
