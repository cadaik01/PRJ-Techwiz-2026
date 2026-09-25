from unittest import mock

import pytest
from django.core.cache import caches
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from accounts.auth.tokens import issue_tokens
from accounts.tests.auth.conftest import PASSWORD, bearer

ME = "/api/auth/me/"
REFRESH = "/api/auth/refresh/"
LOGOUT = "/api/auth/logout/"
CHANGE_PASSWORD = "/api/auth/change-password/"
LOGIN = "/api/auth/login/"
NEW_PASSWORD = "Papaya2027z"


def _me(api, access):
    return api.get(ME, **bearer(access))


def _refresh(api, refresh):
    return api.post(REFRESH, {"refresh": refresh}, format="json")


@pytest.mark.django_db
class TestSessionId:
    def test_each_login_gets_its_own_session_id(self, customer):
        device_a = issue_tokens(customer)
        device_b = issue_tokens(customer)

        sid_a = AccessToken(device_a["access"])["sid"]
        assert sid_a == RefreshToken(device_a["refresh"])["sid"]
        assert sid_a != AccessToken(device_b["access"])["sid"]

    def test_rotation_keeps_session_and_previous_access_token(self, api, customer):
        tokens = issue_tokens(customer)

        rotated = _refresh(api, tokens["refresh"]).json()["data"]

        assert AccessToken(rotated["access"])["sid"] == AccessToken(tokens["access"])["sid"]
        assert _me(api, tokens["access"]).status_code == 200
        assert _me(api, rotated["access"]).status_code == 200

    def test_token_without_session_id_is_rejected(self, api, customer):
        legacy_access = AccessToken.for_user(customer)

        response = _me(api, str(legacy_access))

        assert response.status_code == 401
        assert response.json()["code"] == "NOT_AUTHENTICATED"


@pytest.mark.django_db
class TestLogoutEndsSessionImmediately:
    def test_access_token_of_logged_out_device_stops_working(self, api, customer):
        device_a = issue_tokens(customer)
        device_b = issue_tokens(customer)

        api.post(LOGOUT, {"refresh": device_a["refresh"]}, format="json", **bearer(device_a["access"]))

        assert _me(api, device_a["access"]).status_code == 401
        assert _me(api, device_b["access"]).status_code == 200

    def test_logout_with_already_rotated_token_still_ends_session(self, api, customer):
        original = issue_tokens(customer)
        rotated = _refresh(api, original["refresh"]).json()["data"]

        response = api.post(LOGOUT, {"refresh": original["refresh"]}, format="json", **bearer(rotated["access"]))

        assert response.status_code == 204
        assert _refresh(api, rotated["refresh"]).status_code == 401

    def test_logout_rejects_refresh_token_of_another_session(self, api, customer):
        device_a = issue_tokens(customer)
        device_b = issue_tokens(customer)

        response = api.post(LOGOUT, {"refresh": device_b["refresh"]}, format="json", **bearer(device_a["access"]))

        assert (response.status_code, response.json()["code"]) == (401, "TOKEN_INVALID")
        assert _refresh(api, device_b["refresh"]).status_code == 200


def _broken_store(**behaviour):
    return mock.patch("accounts.auth.sessions._store", return_value=mock.Mock(**behaviour))


@pytest.mark.django_db
class TestRedisOutage:
    def test_requests_still_authenticate_when_redis_read_fails(self, api, customer):
        access = issue_tokens(customer)["access"]

        with _broken_store(**{"get.side_effect": ConnectionError("redis down")}):
            response = _me(api, access)

        assert response.status_code == 200

    def test_refresh_fails_closed_when_redis_is_down(self, api, customer):
        tokens = issue_tokens(customer)

        with _broken_store(**{"get_many.side_effect": ConnectionError("redis down"), "add.side_effect": ConnectionError("redis down")}):
            response = _refresh(api, tokens["refresh"])

        assert response.status_code == 500
        assert "access" not in response.json()["data"]

    def test_logout_reports_failure_when_revocation_cannot_be_stored(self, api, customer):
        tokens = issue_tokens(customer)

        with _broken_store(**{"set.side_effect": ConnectionError("redis down"), "get.return_value": None}):
            response = api.post(LOGOUT, {"refresh": tokens["refresh"]}, format="json", **bearer(tokens["access"]))

        assert response.status_code == 500


@pytest.mark.django_db
class TestNoDatabaseBlacklist:
    def test_issuing_tokens_does_not_touch_the_database(self, customer, django_assert_num_queries):
        with django_assert_num_queries(0):
            issue_tokens(customer)


@pytest.mark.django_db
class TestChangePasswordKicksOtherDevices:
    @pytest.fixture
    def devices(self, api, customer):
        current = issue_tokens(customer)
        other = issue_tokens(customer)
        rotated_other = _refresh(api, other["refresh"]).json()["data"]
        body = {"current_password": PASSWORD, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD}
        response = api.post(CHANGE_PASSWORD, body, format="json", **bearer(current["access"]))
        assert response.status_code == 200
        return current, rotated_other

    def test_other_device_is_kicked_out_immediately(self, api, devices):
        _, other = devices

        me = _me(api, other["access"])
        refreshed = _refresh(api, other["refresh"])

        assert (me.status_code, me.json()["code"]) == (401, "NOT_AUTHENTICATED")
        assert (refreshed.status_code, refreshed.json()["code"]) == (401, "TOKEN_INVALID")

    def test_other_device_stays_out_even_if_redis_loses_everything(self, api, devices):
        _, other = devices
        for alias in caches:
            caches[alias].clear()

        assert _me(api, other["access"]).status_code == 401
        assert _refresh(api, other["refresh"]).status_code == 401

    def test_current_device_keeps_session_through_one_refresh(self, api, devices):
        current, _ = devices

        stale = _me(api, current["access"])
        refreshed = _refresh(api, current["refresh"])

        assert (stale.status_code, stale.json()["code"]) == (401, "NOT_AUTHENTICATED")
        assert refreshed.status_code == 200
        assert _me(api, refreshed.json()["data"]["access"]).status_code == 200

    def test_only_new_password_can_log_in(self, api, devices):
        old = api.post(LOGIN, {"email": "alice@example.com", "password": PASSWORD}, format="json")
        new = api.post(LOGIN, {"email": "alice@example.com", "password": NEW_PASSWORD}, format="json")

        assert old.status_code == 401
        assert new.status_code == 200
