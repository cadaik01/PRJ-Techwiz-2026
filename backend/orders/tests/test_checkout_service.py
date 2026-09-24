from datetime import datetime, time, timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.exceptions import AccountLockedError
from notifications.models import Notification
from orders.exceptions import (
    CutoffPassedError,
    InsufficientStockError,
    OpenOrderLimitExceededError,
    ProductNotAvailableError,
    SlotNotAvailableError,
)
from orders.models import Order
from orders.services.checkout_service import place_orders
from tests_support.factories import make_customer, make_farmer, make_market, make_order, make_product, make_slot


@pytest.fixture
def shop(db):
    today = timezone.localdate()
    pickup_date = today + timedelta(days=3)
    market = make_market()
    farmer_a, farmer_b = make_farmer(), make_farmer()
    return SimpleNamespace(
        now=timezone.make_aware(datetime.combine(today, time(9, 0))),
        date=pickup_date,
        market=market,
        customer=make_customer(),
        farmer_a=farmer_a,
        farmer_b=farmer_b,
        slot_a=make_slot(farmer=farmer_a, market=market, day_of_week=pickup_date.isoweekday()),
        slot_b=make_slot(farmer=farmer_b, market=market, day_of_week=pickup_date.isoweekday()),
        tomato=make_product(farmer=farmer_a, stock=10, price=25000),
        herbs=make_product(farmer=farmer_a, stock=3, price=12000),
        eggs=make_product(farmer=farmer_b, stock=5, price=40000),
    )


def _group(farmer, slot, pickup_date, *items, note=None):
    return {
        "farmer_id": farmer.pk,
        "pickup_slot_id": slot.pk,
        "pickup_date": pickup_date,
        "note": note,
        "items": [{"product_id": product.pk, "quantity": quantity} for product, quantity in items],
    }


def _checkout(shop, *groups):
    return place_orders(customer=shop.customer, groups=list(groups), now=shop.now)


@pytest.mark.django_db
class TestPlaceOrders:
    def test_creates_one_placed_order_with_snapshots(self, shop):
        [order] = _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 2), (shop.herbs, 1), note="Ring me"))

        shop.tomato.refresh_from_db()
        shop.herbs.refresh_from_db()
        start = timezone.make_aware(datetime.combine(shop.date, time(8, 0)))
        assert (order.status, order.version, order.customer_id, order.farmer_id) == ("PLACED", 1, shop.customer.id, shop.farmer_a.pk)
        assert (order.market_id, order.pickup_slot_id, order.stall_label) == (shop.market.id, shop.slot_a.id, "Row B, stall 12")
        assert (order.pickup_start_at, order.cutoff_at) == (start, start - timedelta(hours=12))
        assert (order.total_amount, order.note) == (62000, "Ring me")
        items = {item.product_id: item for item in order.items.all()}
        assert (items[shop.tomato.id].unit_price, items[shop.tomato.id].line_total) == (25000, 50000)
        assert items[shop.tomato.id].product_name == shop.tomato.name
        assert (shop.tomato.stock_quantity, shop.herbs.stock_quantity) == (8, 2)
        history = order.status_history.get()
        assert (history.from_status, history.to_status, history.transition) == (None, "PLACED", "T1")
        assert (history.actor_id, history.actor_role) == (shop.customer.id, "CUSTOMER")
        assert Notification.objects.get(recipient=shop.farmer_a.user).type == "ORDER_PLACED"

    def test_creates_independent_orders_per_farmer(self, shop):
        orders = _checkout(
            shop,
            _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)),
            _group(shop.farmer_b, shop.slot_b, shop.date, (shop.eggs, 2)),
        )

        assert [order.farmer_id for order in orders] == [shop.farmer_a.pk, shop.farmer_b.pk]
        assert [order.total_amount for order in orders] == [25000, 80000]

    def test_all_or_nothing_reports_every_shortage(self, shop):
        shop.eggs.stock_quantity = 0
        shop.eggs.save()

        with pytest.raises(InsufficientStockError) as caught:
            _checkout(
                shop,
                _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1), (shop.herbs, 5)),
                _group(shop.farmer_b, shop.slot_b, shop.date, (shop.eggs, 1)),
            )

        assert caught.value.errors == {
            "groups.0.items.1.quantity": ["Only 3 KG left"],
            "groups.1.items.0.quantity": ["Out of stock"],
        }
        assert caught.value.data == {"available": {str(shop.herbs.id): 3, str(shop.eggs.id): 0}}
        shop.tomato.refresh_from_db()
        assert shop.tomato.stock_quantity == 10
        assert not Order.objects.exists()

    def test_one_open_order_per_farmer(self, shop):
        make_order(customer=shop.customer, product=shop.tomato)

        with pytest.raises(OpenOrderLimitExceededError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.herbs, 1)))

        assert "groups.0.farmer_id" in caught.value.errors

    def test_at_most_five_open_orders(self, shop):
        for _ in range(5):
            make_order(customer=shop.customer, product=make_product(farmer=make_farmer()))

        with pytest.raises(OpenOrderLimitExceededError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))

        assert "non_field_errors" in caught.value.errors

    def test_overdue_order_is_expired_first_and_no_longer_counts(self, shop):
        overdue = make_order(customer=shop.customer, product=shop.tomato, pickup_start_at=shop.now - timedelta(hours=1))

        orders = _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.herbs, 1)))

        overdue.refresh_from_db()
        assert overdue.status == "EXPIRED"
        assert len(orders) == 1

    def test_overdue_orders_with_farmers_outside_the_cart_do_not_count(self, shop):
        for _ in range(5):
            make_order(customer=shop.customer, product=make_product(farmer=make_farmer()),
                       pickup_start_at=shop.now - timedelta(hours=1))

        orders = _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))

        assert len(orders) == 1

    def test_stock_held_by_an_overdue_order_is_released_before_checking(self, shop):
        shop.herbs.stock_quantity = 0
        shop.herbs.save()
        make_order(customer=make_customer(), product=shop.herbs, quantity=3, pickup_start_at=shop.now - timedelta(hours=1))

        _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.herbs, 2)))

        shop.herbs.refresh_from_db()
        assert shop.herbs.stock_quantity == 1

    def test_locked_customer_cannot_place_orders(self, shop):
        shop.customer.is_active = False
        shop.customer.save()
        shop.customer.customer_profile.deactivation_reason = "Repeated no-shows"
        shop.customer.customer_profile.save()

        with pytest.raises(AccountLockedError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))
        assert caught.value.errors == {"reason": ["Repeated no-shows"]}
        assert not Order.objects.exists()

    def test_product_of_another_farmer_is_a_validation_error(self, shop):
        with pytest.raises(ValidationError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.eggs, 1)))

        assert "groups.0.items.0.product_id" in caught.value.detail

    @pytest.mark.parametrize("field, value", [("is_archived", True), ("is_hidden_by_admin", True), ("is_available", False)])
    def test_unpublished_product_is_not_available(self, shop, field, value):
        setattr(shop.tomato, field, value)
        shop.tomato.save()

        with pytest.raises(ProductNotAvailableError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))

        assert "groups.0.items.0.product_id" in caught.value.errors

    def test_unapproved_farmer_is_not_available(self, shop):
        shop.farmer_a.status = "SUSPENDED"
        shop.farmer_a.save()

        with pytest.raises(ProductNotAvailableError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))

        assert "groups.0.farmer_id" in caught.value.errors

    def test_invalid_slot_points_at_the_group(self, shop):
        with pytest.raises(SlotNotAvailableError) as caught:
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date + timedelta(days=1), (shop.tomato, 1)))

        assert "groups.0.pickup_slot_id" in caught.value.errors

    def test_past_cutoff_is_rejected(self, shop):
        shop.now = timezone.make_aware(datetime.combine(shop.date, time(8, 0))) - timedelta(hours=1)

        with pytest.raises(CutoffPassedError):
            _checkout(shop, _group(shop.farmer_a, shop.slot_a, shop.date, (shop.tomato, 1)))
