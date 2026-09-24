import pytest
from rest_framework_simplejwt.tokens import AccessToken

from accounts.auth.tokens import issue_tokens

URL = "/api/auth/refresh/"


def _refresh(api, token):
    return api.post(URL, {"refresh": token}, format="json")


@pytest.mark.django_db
class TestRefresh:
    def test_rotates_token_pair(self, api, customer):
        old = issue_tokens(customer)

        response = _refresh(api, old["refresh"])

        assert response.status_code == 200
        data = response.json()["data"]
        assert set(data) == {"access", "refresh"}
        assert data["refresh"] != old["refresh"]
        assert AccessToken(data["access"])["role"] == "CUSTOMER"

    def test_reusing_rotated_refresh_token_is_rejected(self, api, customer):
        old = issue_tokens(customer)["refresh"]
        _refresh(api, old)

        response = _refresh(api, old)

        assert response.status_code == 401
        assert response.json()["code"] == "TOKEN_INVALID"

    def test_new_refresh_token_keeps_working(self, api, customer):
        rotated = _refresh(api, issue_tokens(customer)["refresh"]).json()["data"]["refresh"]

        assert _refresh(api, rotated).status_code == 200

    @pytest.mark.parametrize("token", ["garbage", ""])
    def test_malformed_token_is_rejected(self, api, token):
        response = _refresh(api, token)

        assert response.status_code in (400, 401)
        assert response.json()["code"] in ("TOKEN_INVALID", "VALIDATION_ERROR")

    def test_access_token_cannot_be_used_as_refresh(self, api, customer):
        response = _refresh(api, issue_tokens(customer)["access"])

        assert response.status_code == 401
        assert response.json()["code"] == "TOKEN_INVALID"

    def test_locked_user_cannot_refresh(self, api, customer):
        refresh = issue_tokens(customer)["refresh"]
        customer.is_active = False
        customer.save()

        response = _refresh(api, refresh)

        assert response.status_code == 403
        assert response.json()["code"] == "ACCOUNT_LOCKED"

    def test_new_access_token_reflects_current_claims(self, api, customer):
        refresh = issue_tokens(customer)["refresh"]
        customer.must_change_password = True
        customer.save()

        access = _refresh(api, refresh).json()["data"]["access"]

        assert AccessToken(access)["must_change_password"] is True
