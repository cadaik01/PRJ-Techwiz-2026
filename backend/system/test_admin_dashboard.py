from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from accounts.models import FarmerStatus
from catalog.models import Category, Product, Unit
from orders.models import Order, OrderStatus
from system.dashboard import DASHBOARD_DAYS, PENDING_FARMER_LIMIT

URL_NAME = "admin-dashboard"


@pytest.mark.django_db
def test_totals_count_each_population(
    admin_client, approved_farmer, customer_user, market, make_farmer, make_order
):
    make_farmer(email="pending@marketlink.test", stall_name="Pending Stall")
    make_order(pickup_date=timezone.localdate())

    totals = admin_client.get(reverse(URL_NAME)).data["data"]["totals"]

    assert totals["farmers"] == 2
    assert totals["farmers_pending"] == 1
    assert totals["customers"] == 1
    assert totals["markets_active"] == 1
    assert totals["orders"] == 1


@pytest.mark.django_db
def test_deactivated_markets_are_not_counted_as_active(admin_client, market):
    market.is_active = False
    market.save(update_fields=["is_active"])

    assert admin_client.get(reverse(URL_NAME)).data["data"]["totals"]["markets_active"] == 0


@pytest.mark.django_db
def test_orders_by_day_always_has_thirty_buckets(admin_client):
    data = admin_client.get(reverse(URL_NAME)).data["data"]["orders_by_day"]

    assert len(data) == DASHBOARD_DAYS
    # A chart needs an unbroken axis, so empty days appear as zeros.
    assert all(row["count"] == 0 for row in data)
    # DateField serializes to an ISO string.
    assert data[-1]["date"] == str(timezone.localdate())
    assert data[0]["date"] == str(timezone.localdate() - timedelta(days=DASHBOARD_DAYS - 1))


@pytest.mark.django_db
def test_orders_land_in_the_bucket_of_the_day_they_were_created(
    admin_client, market, make_order
):
    make_order(pickup_date=timezone.localdate())
    make_order(pickup_date=timezone.localdate())
    old = make_order(pickup_date=timezone.localdate())
    Order.objects.filter(pk=old.pk).update(
        created_at=timezone.now() - timedelta(days=DASHBOARD_DAYS + 5)
    )

    data = admin_client.get(reverse(URL_NAME)).data["data"]["orders_by_day"]

    assert data[-1]["count"] == 2
    # The backdated order falls outside the 30-day window entirely.
    assert sum(row["count"] for row in data) == 2


@pytest.mark.django_db
def test_orders_by_status_lists_every_status_including_zeros(admin_client, market, make_order):
    make_order(pickup_date=timezone.localdate(), status=OrderStatus.COMPLETED)
    make_order(pickup_date=timezone.localdate(), status=OrderStatus.PLACED)

    rows = admin_client.get(reverse(URL_NAME)).data["data"]["orders_by_status"]

    assert [row["status"] for row in rows] == list(OrderStatus.values)
    counts = {row["status"]: row["count"] for row in rows}
    assert counts["COMPLETED"] == 1
    assert counts["PLACED"] == 1
    assert counts["NO_SHOW"] == 0


@pytest.mark.django_db
def test_pending_farmers_are_the_five_newest(admin_client, make_farmer):
    for index in range(7):
        make_farmer(email=f"pending{index}@marketlink.test", stall_name=f"Stall {index}")
    make_farmer(
        email="approved@marketlink.test", stall_name="Approved Stall", status=FarmerStatus.APPROVED
    )

    rows = admin_client.get(reverse(URL_NAME)).data["data"]["pending_farmers"]

    assert len(rows) == PENDING_FARMER_LIMIT
    assert [row["stall_name"] for row in rows] == [f"Stall {i}" for i in (6, 5, 4, 3, 2)]


@pytest.mark.django_db
def test_a_pending_farmer_row_carries_its_counts(admin_client, make_farmer, market, make_order):
    farmer = make_farmer(email="pending@marketlink.test", stall_name="Pending Stall")
    bucket = Category.objects.create(name="Vegetables", display_order=1)
    Product.objects.create(
        farmer=farmer, category=bucket, name="Tomato", price="2.50", unit=Unit.KG, stock_quantity=4
    )
    Product.objects.create(
        farmer=farmer,
        category=bucket,
        name="Archived kale",
        price="1.00",
        unit=Unit.BUNCH,
        stock_quantity=0,
        is_archived=True,
    )
    make_order(pickup_date=timezone.localdate(), status=OrderStatus.PLACED, farmer=farmer)
    make_order(pickup_date=timezone.localdate(), status=OrderStatus.COMPLETED, farmer=farmer)

    row = admin_client.get(reverse(URL_NAME)).data["data"]["pending_farmers"][0]

    assert row["id"] == farmer.user_id
    assert row["email"] == "pending@marketlink.test"
    assert row["status"] == FarmerStatus.PENDING
    # Archived products are soft-deleted, so only the live catalogue counts.
    assert row["product_count"] == 1
    assert row["open_order_count"] == 1


@pytest.mark.django_db
def test_customer_cannot_reach_the_dashboard(customer_client):
    assert customer_client.get(reverse(URL_NAME)).status_code == 403
