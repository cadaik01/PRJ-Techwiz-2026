"""Tests for the security audit log writer (system.services)."""

import pytest

from system.models import AuditAction
from system.services import log_security_event


@pytest.mark.django_db
def test_log_strips_credentials_and_rejects_bad_ip():
    entry = log_security_event(
        user=None, action=AuditAction.LOGIN_FAILED, endpoint='/api/auth/login/', method='POST',
        ip_address='not-an-ip', user_agent='x' * 600, status_code=401, request_id=None,
        details={'email': 'a@b.c', 'password': 'p', 'nested': {'refresh_token': 't', 'keep': 1}},
    )

    assert entry.details == {'email': 'a@b.c', 'nested': {'keep': 1}}
    assert entry.ip_address is None
    assert len(entry.user_agent) == 255
