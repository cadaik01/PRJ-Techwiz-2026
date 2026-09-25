from datetime import time, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from markets.conftest import MONDAY, SATURDAY, WEDNESDAY
from markets.models import Market, PickupSlot
from notifications.models import Notification, NotificationType
from orders.models import OrderStatus

LIST_URL_NAME = "admin-market-list"
DETAIL_URL_NAME = "admin-market-detail"
DEACTIVATE_URL_NAME = "admin-market-deactivate"
ACTIVATE_URL_NAME = "admin-market-activate"


def _payload(**overrides):
    body = {
        "name": "Riverside Market",
        "address": "88 Riverside Road",
        "latitude": "10.800000",
        "longitude": "106.700000",
        "operating_days": [MONDAY, SATURDAY],
        "open_time": "07:00",
        "close_time": "13:00",
    }
    body.update(overrides)
    return body


@pytest.mark.django_db
def test_list_is_paginated_and_counts_farmers(admin_client, market, farmer_market):
    Market.objects.create(
        name="Closed Market",
        address="9 Quiet Lane",
        latitude="10.5",
        longitude="106.5",
        open_time=time(6, 0),
        close_time=time(10, 0),
        is_active=False,
    )

    response = admin_client.get(reverse(LIST_URL_NAME))

    assert response.status_code == 200
    data = response.data["data"]
    assert {"count", "page", "page_size", "total_pages", "results"} <= data.keys()
    # AD-14 includes deactivated markets.
    assert data["count"] == 2
    central = next(row for row in data["results"] if row["name"] == "Central Market")
    assert central["operating_days"] == [MONDAY, WEDNESDAY]
    assert central["open_time"] == "06:00"
    assert central["farmer_count"] == 1
    assert central["open_order_count"] == 0
    assert central["upcoming_closures"] == []


@pytest.mark.django_db
def test_pending_farmers_do_not_count(admin_client, market, farmer_market, approved_farmer):
    approved_farmer.status = "PENDING"
    approved_farmer.save(update_fields=["status"])

    response = admin_client.get(reverse(LIST_URL_NAME))

    row = next(r for r in response.data["data"]["results"] if r["name"] == "Central Market")
    assert row["farmer_count"] == 0


@pytest.mark.django_db
def test_open_order_count_ignores_finished_orders(admin_client, market, make_order):
    today = timezone.localdate()
    make_order(pickup_date=today, status=OrderStatus.PLACED)
    make_order(pickup_date=today, status=OrderStatus.ACCEPTED)
    make_order(pickup_date=today, status=OrderStatus.COMPLETED)
    make_order(pickup_date=today, status=OrderStatus.CANCELLED)

    response = admin_client.get(reverse(DETAIL_URL_NAME, args=[market.id]))

    assert response.data["data"]["open_order_count"] == 2


@pytest.mark.django_db
def test_search_matches_name_or_address(admin_client, market):
    assert admin_client.get(reverse(LIST_URL_NAME), {"q": "central"}).data["data"]["count"] == 1
    assert (
        admin_client.get(reverse(LIST_URL_NAME), {"q": "Market Street"}).data["data"]["count"] == 1
    )
    assert admin_client.get(reverse(LIST_URL_NAME), {"q": "nowhere"}).data["data"]["count"] == 0


@pytest.mark.django_db
def test_filter_by_activation_state(admin_client, market):
    market.is_active = False
    market.save(update_fields=["is_active"])

    assert admin_client.get(reverse(LIST_URL_NAME), {"is_active": "false"}).data["data"][
        "count"
    ] == 1
    assert admin_client.get(reverse(LIST_URL_NAME), {"is_active": "true"}).data["data"]["count"] == 0


@pytest.mark.django_db
def test_create_market_with_operating_days(admin_client):
    response = admin_client.post(reverse(LIST_URL_NAME), _payload(), format="json")

    assert response.status_code == 201
    data = response.data["data"]
    assert data["operating_days"] == [MONDAY, SATURDAY]
    assert data["map_provider"] == "OSM"
    assert data["is_active"] is True
    assert data["distance_km"] is None
    assert data["is_favorite"] is None


@pytest.mark.django_db
def test_create_requires_at_least_one_operating_day(admin_client):
    response = admin_client.post(
        reverse(LIST_URL_NAME), _payload(operating_days=[]), format="json"
    )

    assert response.status_code == 400
    assert "operating_days" in response.data["errors"]


@pytest.mark.django_db
def test_close_time_must_follow_open_time(admin_client):
    response = admin_client.post(
        reverse(LIST_URL_NAME), _payload(open_time="13:00", close_time="07:00"), format="json"
    )

    assert response.status_code == 400
    assert response.data["code"] == "VALIDATION_ERROR"
    assert "close_time" in response.data["errors"]


@pytest.mark.django_db
def test_duplicate_name_is_a_field_error(admin_client, market):
    response = admin_client.post(
        reverse(LIST_URL_NAME), _payload(name="Central Market"), format="json"
    )

    assert response.status_code == 400
    assert "name" in response.data["errors"]


@pytest.mark.django_db
def test_patching_only_the_open_time_checks_against_the_stored_close_time(admin_client, market):
    response = admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]), {"open_time": "20:00"}, format="json"
    )

    assert response.status_code == 400
    assert "close_time" in response.data["errors"]


@pytest.mark.django_db
def test_renaming_does_not_touch_pickup_slots(admin_client, market, make_slot):
    slot = make_slot(day_of_week=MONDAY, start=time(7, 0), end=time(9, 0))

    response = admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]), {"name": "Central Bazaar"}, format="json"
    )

    assert response.status_code == 200
    assert response.data["data"]["deactivated_slot_count"] == 0
    slot.refresh_from_db()
    assert slot.is_active is True
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_dropping_a_day_disables_the_slots_on_it_and_notifies_the_farmer(
    admin_client, market, make_slot, farmer_user
):
    kept = make_slot(day_of_week=MONDAY, start=time(7, 0), end=time(9, 0))
    dropped = make_slot(day_of_week=WEDNESDAY, start=time(7, 0), end=time(9, 0))

    response = admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]), {"operating_days": [MONDAY]}, format="json"
    )

    assert response.status_code == 200
    assert response.data["data"]["deactivated_slot_count"] == 1
    kept.refresh_from_db()
    dropped.refresh_from_db()
    assert kept.is_active is True
    assert dropped.is_active is False

    notification = Notification.objects.get(recipient=farmer_user)
    assert notification.type == NotificationType.MARKET_SCHEDULE_CHANGED
    assert "Central Market" in notification.message
    assert notification.target_url == "/farmer/markets"


@pytest.mark.django_db
def test_narrowing_the_hours_disables_the_slots_outside_them(admin_client, market, make_slot):
    early = make_slot(day_of_week=MONDAY, start=time(6, 30), end=time(8, 0))
    late = make_slot(day_of_week=MONDAY, start=time(10, 0), end=time(11, 30))

    response = admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]),
        {"open_time": "09:00", "close_time": "12:00"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["data"]["deactivated_slot_count"] == 1
    early.refresh_from_db()
    late.refresh_from_db()
    assert early.is_active is False
    assert late.is_active is True


@pytest.mark.django_db
def test_placed_orders_survive_a_schedule_change(admin_client, market, make_slot, make_order):
    make_slot(day_of_week=WEDNESDAY, start=time(7, 0), end=time(9, 0))
    order = make_order(pickup_date=timezone.localdate() + timedelta(days=1))

    admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]), {"operating_days": [MONDAY]}, format="json"
    )

    order.refresh_from_db()
    assert order.status == OrderStatus.PLACED


@pytest.mark.django_db
def test_already_disabled_slots_are_not_counted_again(admin_client, market, make_slot):
    slot = make_slot(day_of_week=WEDNESDAY, start=time(7, 0), end=time(9, 0))
    PickupSlot.objects.filter(pk=slot.pk).update(is_active=False)

    response = admin_client.patch(
        reverse(DETAIL_URL_NAME, args=[market.id]), {"operating_days": [MONDAY]}, format="json"
    )

    assert response.data["data"]["deactivated_slot_count"] == 0
    assert not Notification.objects.exists()


@pytest.mark.django_db
def test_deactivate_and_activate_a_quiet_market(admin_client, market):
    response = admin_client.post(reverse(DEACTIVATE_URL_NAME, args=[market.id]))
    assert response.status_code == 200
    assert response.data["data"]["is_active"] is False

    response = admin_client.post(reverse(ACTIVATE_URL_NAME, args=[market.id]))
    assert response.status_code == 200
    assert response.data["data"]["is_active"] is True


@pytest.mark.django_db
def test_deactivate_is_refused_while_orders_are_open(admin_client, market, make_order):
    make_order(pickup_date=timezone.localdate() + timedelta(days=1))

    response = admin_client.post(reverse(DEACTIVATE_URL_NAME, args=[market.id]))

    assert response.status_code == 422
    assert response.data["code"] == "RESOURCE_IN_USE"
    assert response.data["errors"]["open_order_count"] == ["1"]
    market.refresh_from_db()
    assert market.is_active is True


@pytest.mark.django_db
def test_deactivating_keeps_the_pickup_slots(admin_client, market, make_slot):
    slot = make_slot(day_of_week=MONDAY, start=time(7, 0), end=time(9, 0))

    admin_client.post(reverse(DEACTIVATE_URL_NAME, args=[market.id]))

    slot.refresh_from_db()
    assert slot.is_active is True


@pytest.mark.django_db
def test_unknown_market_is_a_404(admin_client):
    assert admin_client.post(reverse(DEACTIVATE_URL_NAME, args=[9999])).status_code == 404
    assert admin_client.get(reverse(DETAIL_URL_NAME, args=[9999])).status_code == 404


@pytest.mark.django_db
def test_put_is_not_allowed(admin_client, market):
    response = admin_client.put(
        reverse(DETAIL_URL_NAME, args=[market.id]), _payload(), format="json"
    )

    assert response.status_code == 405


@pytest.mark.django_db
def test_customer_cannot_reach_the_market_admin(customer_client, market):
    assert customer_client.get(reverse(LIST_URL_NAME)).status_code == 403
    assert customer_client.post(reverse(DEACTIVATE_URL_NAME, args=[market.id])).status_code == 403
