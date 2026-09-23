"""Tests for the security audit log."""

import pytest
from django.urls import reverse

from system.models import AuditAction, AuditLog
from system.services import log_security_event


@pytest.mark.django_db
def test_non_admin_gets_403_and_the_attempt_is_logged(auth_client, user):
    response = auth_client.get(reverse('admin-audit-log-list'))

    assert response.status_code == 403
    assert response.data['code'] == 'ACTION_NOT_PERMITTED_FOR_ROLE'
    entry = AuditLog.objects.get(action=AuditAction.UNAUTHORIZED_ACCESS)
    assert entry.user == user
    assert entry.endpoint == '/api/admin/audit-logs/'
    assert entry.request_id == response.data['request_id']


@pytest.mark.django_db
def test_admin_lists_audit_logs_paginated(admin_client, admin_user):
    log_security_event(
        user=admin_user, action=AuditAction.EXPORT_DATA, endpoint='/api/x/',
        ip_address='10.0.0.1', user_agent='pytest', status_code=200, request_id=None,
    )
    response = admin_client.get(reverse('admin-audit-log-list'), {'action': 'export_data'})

    assert response.status_code == 200
    assert response.data['data']['count'] == 1
    row = response.data['data']['results'][0]
    assert (row['action'], row['user_email']) == ('EXPORT_DATA', admin_user.email)


@pytest.mark.django_db
def test_log_strips_credentials_and_rejects_bad_ip():
    entry = log_security_event(
        user=None, action=AuditAction.LOGIN, endpoint='/api/auth/login/',
        ip_address='not-an-ip', user_agent='x' * 600, status_code=401, request_id=None,
        details={'email': 'a@b.c', 'password': 'p', 'nested': {'refresh_token': 't', 'keep': 1}},
    )

    assert entry.details == {'email': 'a@b.c', 'nested': {'keep': 1}}
    assert entry.ip_address is None
    assert len(entry.user_agent) == 512
