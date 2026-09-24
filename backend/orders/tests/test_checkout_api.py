import uuid
from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.auth.tokens import issue_tokens
from orders.models import Order
from system.models import AuditLog
from tests_support.factories import make_customer, make_farmer, make_market, make_order, make_product, make_slot

URL = "/api/customer/orders/"
SUMMARY_KEYS = {
    "id", "status", "is_overdue", "version", "customer", "farmer", "market", "stall_label", "pickup_date",
    "pickup_start_at", "pickup_end_at", "cutoff_at", "item_count", "total_amount", "created_at",
}


@pytest.fixture
def shop(db):
    pickup_date = timezone.localdate() + timedelta(days=3)
    market = make_market()
    farmer_a, farmer_b = make_farmer(), make_farmer()
    return SimpleNamespace(
        date=pickup_date.isoformat(),
        customer=make_customer(),
        farmer_a=farmer_a,
        farmer_b=farmer_b,
        slot_a=make_slot(farmer=farmer_a, market=market, day_of_week=pickup_date.isoweekday()),
        slot_b=make_slot(farmer=farmer_b, market=market, day_of_week=pickup_date.isoweekday()),
        tomato=make_product(farmer=farmer_a, stock=10, price=25000),
        eggs=make_product(farmer=farmer_b, stock=1, price=40000),
    )


def _body(shop, tomato_qty=2, eggs_qty=1):
    return {"groups": [
        {"farmer_id": shop.farmer_a.pk, "pickup_slot_id": shop.slot_a.pk, "pickup_date": shop.date,
         "items": [{"product_id": shop.tomato.pk, "quantity": tomato_qty}]},
        {"farmer_id": shop.farmer_b.pk, "pickup_slot_id": shop.slot_b.pk, "pickup_date": shop.date,
         "items": [{"product_id": shop.eggs.pk, "quantity": eggs_qty}]},
    ]}


def _post(user, body, key=None, with_key=True):
    headers = {"HTTP_AUTHORIZATION": f"Bearer {issue_tokens(user)['access']}"}
    if with_key:
        headers["HTTP_IDEMPOTENCY_KEY"] = key or str(uuid.uuid4())
    return APIClient().post(URL, body, format="json", **headers)


@pytest.mark.django_db
class TestCheckoutApi:
    def test_creates_orders_and_returns_summaries(self, shop):
        response = _post(shop.customer, _body(shop))

        assert response.status_code == 201
        body = response.json()
        assert body["message"] == "Placed 2 order(s) successfully"
        orders = body["data"]["orders"]
        assert len(orders) == 2 and set(orders[0]) == SUMMARY_KEYS
        assert (orders[0]["status"], orders[0]["total_amount"], orders[0]["item_count"]) == ("PLACED", 50000, 1)
        assert orders[0]["farmer"] == {"id": shop.farmer_a.pk, "stall_name": shop.farmer_a.stall_name, "phone": shop.farmer_a.phone}
        assert orders[0]["cutoff_at"].endswith("+07:00")

    def test_missing_idempotency_key_is_428(self, shop):
        response = _post(shop.customer, _body(shop), with_key=False)

        assert (response.status_code, response.json()["code"]) == (428, "PRECONDITION_REQUIRED")

    def test_same_key_replays_without_creating_again(self, shop):
        key = str(uuid.uuid4())
        first = _post(shop.customer, _body(shop), key=key)

        second = _post(shop.customer, _body(shop), key=key)

        assert second.status_code == 201
        assert second["Idempotent-Replayed"] == "true"
        assert second.json() == first.json()
        assert Order.objects.count() == 2

    def test_same_key_with_different_body_is_rejected(self, shop):
        key = str(uuid.uuid4())
        _post(shop.customer, _body(shop), key=key)

        response = _post(shop.customer, _body(shop, tomato_qty=3), key=key)

        assert (response.status_code, response.json()["code"]) == (422, "IDEMPOTENCY_KEY_REUSED")

    def test_failed_attempt_can_retry_with_the_same_key(self, shop):
        key = str(uuid.uuid4())
        failed = _post(shop.customer, _body(shop, eggs_qty=2), key=key)

        retried = _post(shop.customer, _body(shop, eggs_qty=1), key=key)

        assert (failed.status_code, failed.json()["code"]) == (400, "INSUFFICIENT_STOCK")
        assert failed.json()["errors"] == {"groups.1.items.0.quantity": ["Only 1 KG left"]}
        assert failed.json()["data"] == {"available": {str(shop.eggs.pk): 1}}
        assert retried.status_code == 201

    def test_last_unit_goes_to_first_customer_only(self, shop):
        body = {"groups": [_body(shop)["groups"][1]]}

        first = _post(shop.customer, body)
        second = _post(make_customer(), body)

        shop.eggs.refresh_from_db()
        assert (first.status_code, second.status_code) == (201, 400)
        assert shop.eggs.stock_quantity == 0

    def test_open_order_limit_is_422(self, shop):
        make_order(customer=shop.customer, product=shop.tomato)

        response = _post(shop.customer, _body(shop))

        assert (response.status_code, response.json()["code"]) == (422, "OPEN_ORDER_LIMIT_EXCEEDED")

    @pytest.mark.parametrize("mutate, error_key", [
        (lambda body: body.update(groups=[]), "groups"),
        (lambda body: body["groups"][1].update(farmer_id=body["groups"][0]["farmer_id"]), "groups"),
        (lambda body: body["groups"][0]["items"][0].update(quantity=0), "groups.0.items.0.quantity"),
        (lambda body: body["groups"][0]["items"].append(dict(body["groups"][0]["items"][0])), "groups.0.items"),
    ])
    def test_malformed_body_is_400(self, shop, mutate, error_key):
        body = _body(shop)
        mutate(body)

        response = _post(shop.customer, body)

        assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
        # List-level errors are nested by DRF, e.g. an empty list flattens to "groups.non_field_errors".
        assert any(key.startswith(error_key) for key in response.json()["errors"])

    def test_farmer_cannot_place_orders(self, shop):
        response = _post(shop.farmer_a.user, _body(shop))

        assert (response.status_code, response.json()["code"]) == (403, "PERMISSION_DENIED")
        assert AuditLog.objects.filter(action="ACCESS_DENIED").exists()

    def test_anonymous_is_401(self, shop):
        response = APIClient().post(URL, _body(shop), format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))

        assert response.status_code == 401

    def test_eleventh_order_attempt_in_an_hour_is_throttled(self, shop):
        for _ in range(10):
            _post(shop.customer, {"groups": []})

        response = _post(shop.customer, {"groups": []})

        assert (response.status_code, response.json()["code"]) == (429, "THROTTLED")
