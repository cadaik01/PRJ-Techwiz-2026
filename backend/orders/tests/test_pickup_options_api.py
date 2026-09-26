from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from tests_support.factories import make_farmer, make_market, make_slot


def _url(farmer_id):
    return f"/api/public/farmers/{farmer_id}/pickup-options/"


@pytest.fixture
def farmer(db):
    farmer = make_farmer()
    pickup_date = timezone.localdate() + timedelta(days=3)
    make_slot(farmer=farmer, market=make_market(), day_of_week=pickup_date.isoweekday())
    return farmer


@pytest.mark.django_db
class TestPickupOptionsApi:
    def test_returns_options_without_login(self, farmer):
        response = APIClient().get(_url(farmer.pk))

        assert response.status_code == 200
        [option] = response.json()["data"]
        assert set(option) == {"market_id", "market_name", "stall_label", "latitude", "longitude", "dates"}
        slot = option["dates"][0]["slots"][0]
        assert slot["cutoff_at"].endswith("+07:00")

    def test_unapproved_farmer_is_not_found(self):
        pending = make_farmer(status="PENDING")

        response = APIClient().get(_url(pending.pk))

        assert (response.status_code, response.json()["code"]) == (404, "NOT_FOUND")

    def test_locked_farmer_account_is_not_found(self, farmer):
        farmer.user.is_active = False
        farmer.user.save()

        response = APIClient().get(_url(farmer.pk))

        assert (response.status_code, response.json()["code"]) == (404, "NOT_FOUND")

    @pytest.mark.parametrize("query", ["days=0", "days=8", "from=not-a-date"])
    def test_invalid_query_is_rejected(self, farmer, query):
        response = APIClient().get(f"{_url(farmer.pk)}?{query}")

        assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
