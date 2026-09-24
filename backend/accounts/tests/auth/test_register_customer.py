import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import CustomerProfile, CustomUser

URL = "/api/auth/register/customer/"


def _payload(**overrides):
    data = {
        "email": "  Alice@Example.COM ",
        "password": "Mango2026x",
        "confirm_password": "Mango2026x",
        "full_name": "Alice Nguyen",
        "phone": "0912345678",
        "address": "12 Market Street, District 1",
    }
    data.update(overrides)
    return data


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
class TestRegisterCustomer:
    def test_creates_customer_and_returns_tokens(self, api):
        response = api.post(URL, _payload(), format="json")

        assert response.status_code == 201
        body = response.json()
        assert body["success"] is True
        user = CustomUser.objects.get(email="alice@example.com")
        assert user.role.code == "CUSTOMER"
        assert user.check_password("Mango2026x")
        profile = CustomerProfile.objects.get(user=user)
        assert (profile.full_name, profile.phone) == ("Alice Nguyen", "0912345678")
        assert body["data"]["user"] == {
            "id": user.id,
            "email": "alice@example.com",
            "role": "CUSTOMER",
            "display_name": "Alice Nguyen",
            "farmer_status": None,
        }
        assert body["data"]["refresh"]

    def test_access_token_carries_role_claims(self, api):
        response = api.post(URL, _payload(), format="json")

        token = AccessToken(response.json()["data"]["access"])
        assert token["role"] == "CUSTOMER"
        assert "must_change_password" not in token.payload

    def test_duplicate_email_returns_email_exists(self, api):
        api.post(URL, _payload(), format="json")

        response = api.post(URL, _payload(email="ALICE@example.com"), format="json")

        assert response.status_code == 400
        assert response.json()["code"] == "EMAIL_EXISTS"
        assert "email" in response.json()["errors"]
        assert CustomUser.objects.filter(email="alice@example.com").count() == 1

    @pytest.mark.parametrize(
        "field, value",
        [
            ("email", "not-an-email"),
            ("password", "short1"),
            ("password", "lettersonly"),
            ("password", "12345678"),
            ("phone", "0123456789"),
            ("phone", "091234567"),
            ("full_name", "A"),
            ("address", "abc"),
        ],
    )
    def test_rejects_invalid_field(self, api, field, value):
        overrides = {field: value}
        if field == "password":
            overrides["confirm_password"] = value

        response = api.post(URL, _payload(**overrides), format="json")

        assert response.status_code == 400
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert field in response.json()["errors"]
        assert not CustomUser.objects.exists()

    def test_rejects_mismatched_confirm_password(self, api):
        response = api.post(URL, _payload(confirm_password="Mango2026y"), format="json")

        assert response.status_code == 400
        assert "confirm_password" in response.json()["errors"]

    def test_accepts_plus84_phone(self, api):
        response = api.post(URL, _payload(phone="+84912345678"), format="json")

        assert response.status_code == 201

    def test_ignores_client_supplied_role(self, api):
        response = api.post(URL, _payload(role="ADMIN", is_staff=True), format="json")

        user = CustomUser.objects.get(email="alice@example.com")
        assert response.status_code == 201
        assert user.role.code == "CUSTOMER"
        assert user.is_staff is False

    def test_throttled_after_ten_per_hour(self, api):
        for i in range(10):
            api.post(URL, _payload(email=f"user{i}@example.com"), format="json")

        response = api.post(URL, _payload(email="user10@example.com"), format="json")

        assert response.status_code == 429
        assert response.json()["code"] == "THROTTLED"
