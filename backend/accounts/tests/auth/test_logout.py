import pytest

from accounts.auth.tokens import issue_tokens
from accounts.tests.auth.conftest import bearer
from system.models import AuditLog

URL = "/api/auth/logout/"
REFRESH_URL = "/api/auth/refresh/"


@pytest.mark.django_db
class TestLogout:
    def test_revokes_only_this_device(self, api, customer):
        device_a = issue_tokens(customer)
        device_b = issue_tokens(customer)

        response = api.post(URL, {"refresh": device_a["refresh"]}, format="json", **bearer(device_a["access"]))

        assert response.status_code == 204
        assert response.content == b""
        assert api.post(REFRESH_URL, {"refresh": device_a["refresh"]}, format="json").status_code == 401
        assert api.post(REFRESH_URL, {"refresh": device_b["refresh"]}, format="json").status_code == 200

    def test_writes_logout_audit(self, api, customer):
        tokens = issue_tokens(customer)

        api.post(URL, {"refresh": tokens["refresh"]}, format="json", **bearer(tokens["access"]))

        log = AuditLog.objects.get(action="LOGOUT")
        assert (log.user_id, log.status_code) == (customer.id, 204)

    def test_requires_authentication(self, api, customer):
        response = api.post(URL, {"refresh": issue_tokens(customer)["refresh"]}, format="json")

        assert response.status_code == 401

    def test_cannot_revoke_another_users_token(self, api, customer, farmer):
        victim = issue_tokens(farmer)
        attacker = issue_tokens(customer)

        response = api.post(URL, {"refresh": victim["refresh"]}, format="json", **bearer(attacker["access"]))

        assert response.status_code == 401
        assert response.json()["code"] == "TOKEN_INVALID"
        assert api.post(REFRESH_URL, {"refresh": victim["refresh"]}, format="json").status_code == 200
