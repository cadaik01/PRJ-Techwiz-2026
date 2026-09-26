import pytest

from accounts.tests.auth.conftest import PASSWORD, bearer
from system.models import AuditLog

URL = "/api/auth/admin/login/"
CUSTOMER_LOGIN = "/api/auth/login/"


def _login(api, email, password=PASSWORD, url=URL):
    return api.post(url, {"email": email, "password": password}, format="json")


@pytest.mark.django_db
class TestAdminLogin:
    def test_returns_tokens_and_me(self, api, admin_user):
        response = _login(api, "admin@example.com")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["access"] and data["refresh"]
        assert (data["user"]["role"], data["user"]["display_name"]) == ("ADMIN", "Administrator")

    @pytest.mark.parametrize("account, email", [("customer", "alice@example.com"), ("farmer", "farmer@example.com")])
    def test_other_roles_are_rejected_even_with_the_right_password(self, api, request, account, email):
        request.getfixturevalue(account)

        response = _login(api, email)

        assert (response.status_code, response.json()["code"]) == (401, "INVALID_CREDENTIALS")

    def test_wrong_portal_looks_identical_to_a_wrong_password(self, api, customer, admin_user):
        wrong_portal = _login(api, "alice@example.com")
        wrong_password = _login(api, "admin@example.com", "Wrong2026x")

        assert wrong_portal.json()["message"] == wrong_password.json()["message"]

    def test_locked_customer_on_admin_portal_does_not_reveal_the_lock(self, api, customer):
        customer.is_active = False
        customer.save()
        customer.customer_profile.deactivation_reason = "Repeated no-shows"
        customer.customer_profile.save()

        response = _login(api, "alice@example.com")

        assert (response.status_code, response.json()["code"]) == (401, "INVALID_CREDENTIALS")
        assert "reason" not in response.json()["errors"]

    def test_admin_tokens_work_on_the_shared_endpoints(self, api, admin_user):
        tokens = _login(api, "admin@example.com").json()["data"]

        assert api.get("/api/auth/me/", **bearer(tokens["access"])).status_code == 200
        rotated = api.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        assert rotated.status_code == 200
        logout = api.post("/api/auth/logout/", {"refresh": rotated.json()["data"]["refresh"]}, format="json",
                          **bearer(rotated.json()["data"]["access"]))
        assert logout.status_code == 204

    def test_sixth_attempt_in_a_minute_is_throttled(self, api, admin_user):
        for _ in range(5):
            _login(api, "admin@example.com", "Wrong2026x")

        response = _login(api, "admin@example.com")

        assert (response.status_code, response.json()["code"]) == (429, "THROTTLED")

    def test_throttle_is_counted_separately_from_the_customer_portal(self, api, customer, admin_user):
        for _ in range(5):
            _login(api, "alice@example.com", "Wrong2026x", url=CUSTOMER_LOGIN)

        assert _login(api, "admin@example.com").status_code == 200


@pytest.mark.django_db
class TestAdminLoginAudit:
    def test_success_is_tagged_with_the_admin_portal(self, api, admin_user):
        _login(api, "admin@example.com")

        log = AuditLog.objects.get(action="LOGIN")
        assert (log.user_id, log.status_code, log.endpoint) == (admin_user.id, 200, URL)
        assert log.details == {"portal": "ADMIN"}

    def test_failure_is_tagged_with_the_admin_portal_without_password(self, api, customer):
        _login(api, "alice@example.com")

        log = AuditLog.objects.get(action="LOGIN_FAILED")
        assert log.status_code == 401
        assert log.details == {"email": "alice@example.com", "error": "INVALID_CREDENTIALS", "portal": "ADMIN"}
        assert PASSWORD not in str(log.details)
