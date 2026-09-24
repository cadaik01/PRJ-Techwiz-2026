import pytest

from accounts.auth.tokens import issue_tokens
from accounts.tests.auth.conftest import PASSWORD, bearer
from system.models import AuditLog

URL = "/api/auth/change-password/"
NEW_PASSWORD = "Papaya2027z"


def _change(api, user, current=PASSWORD, new=NEW_PASSWORD, confirm=None):
    tokens = issue_tokens(user)
    body = {"current_password": current, "new_password": new, "confirm_password": confirm or new}
    return api.post(URL, body, format="json", **bearer(tokens["access"])), tokens


@pytest.mark.django_db
class TestChangePassword:
    def test_changes_password_and_clears_flag(self, api, customer):
        customer.must_change_password = True
        customer.save()

        response, _ = _change(api, customer)

        customer.refresh_from_db()
        assert response.status_code == 200
        assert response.json()["data"] == {}
        assert customer.check_password(NEW_PASSWORD)
        assert customer.must_change_password is False

    def test_keeps_current_session(self, api, customer):
        response, tokens = _change(api, customer)

        refreshed = api.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        assert response.status_code == 200
        assert refreshed.status_code == 200

    def test_wrong_current_password(self, api, customer):
        response, _ = _change(api, customer, current="Wrong2026x")

        customer.refresh_from_db()
        assert response.status_code == 400
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert "current_password" in response.json()["errors"]
        assert customer.check_password(PASSWORD)

    def test_weak_new_password(self, api, customer):
        response, _ = _change(api, customer, new="short1")

        assert response.status_code == 400
        assert "new_password" in response.json()["errors"]

    def test_mismatched_confirmation(self, api, customer):
        response, _ = _change(api, customer, confirm="Papaya2027y")

        assert response.status_code == 400
        assert "confirm_password" in response.json()["errors"]

    def test_writes_audit(self, api, customer):
        _change(api, customer)

        assert AuditLog.objects.filter(action="PASSWORD_CHANGED", user=customer).count() == 1

    def test_guessing_current_password_is_throttled_per_user(self, api, customer):
        for _ in range(5):
            _change(api, customer, current="Wrong2026x")

        response, _ = _change(api, customer)

        assert response.status_code == 429
        assert response.json()["code"] == "THROTTLED"

    def test_requires_authentication(self, api):
        response = api.post(URL, {}, format="json")

        assert response.status_code == 401
