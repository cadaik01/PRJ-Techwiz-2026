"""Security log browsing (FR-58, AD-29, AD-30)."""

from datetime import datetime

import pytest
from django.urls import reverse
from django.utils import timezone

from system.models import AuditAction, AuditLog
from system.services import log_security_event

LIST_URL = reverse('admin-audit-log-list')


def log(action, user=None, at=None):
    entry = log_security_event(
        user=user, action=action, endpoint='/api/x/', method='GET',
        ip_address='10.0.0.1', user_agent='pytest', status_code=200, request_id=None, details={'k': 1},
    )
    if at:
        AuditLog.objects.filter(pk=entry.pk).update(created_at=timezone.make_aware(at))
    return entry


def actions(client, **params):
    return [row['action'] for row in client.get(LIST_URL, params).data['data']['results']]


@pytest.mark.django_db
def test_non_admin_gets_403_and_the_attempt_is_logged(auth_client, user):
    response = auth_client.get(LIST_URL)

    assert response.status_code == 403
    entry = AuditLog.objects.get(action=AuditAction.ACCESS_DENIED)
    assert (entry.user, entry.method, entry.endpoint) == (user, 'GET', '/api/admin/audit-logs/')
    assert entry.request_id == response.data['request_id']


@pytest.mark.django_db
def test_row_matches_the_audit_log_schema(admin_client, admin_user):
    log(AuditAction.EXPORT_DATA, user=admin_user)
    log(AuditAction.LOGIN_FAILED)

    data = admin_client.get(LIST_URL).data['data']

    assert (data['count'], data['page_size']) == (2, 20)
    anonymous, exported = data['results']
    assert set(exported) == {
        'id', 'user', 'action', 'endpoint', 'method', 'ip_address',
        'user_agent', 'status_code', 'request_id', 'details', 'created_at',
    }
    assert exported['user'] == {'id': admin_user.pk, 'email': admin_user.email}
    assert anonymous['user'] is None


@pytest.mark.django_db
def test_filters_by_action_list_and_user(admin_client, admin_user, user):
    log(AuditAction.LOGIN, user=user)
    log(AuditAction.LOGOUT, user=user)
    log(AuditAction.EXPORT_DATA, user=admin_user)

    assert actions(admin_client, action='login,export_data') == ['EXPORT_DATA', 'LOGIN']
    assert actions(admin_client, user_id=user.pk) == ['LOGOUT', 'LOGIN']
    assert admin_client.get(LIST_URL, {'user_id': 'abc'}).status_code == 400


@pytest.mark.django_db
def test_date_range_uses_vietnam_calendar_days(admin_client):
    log(AuditAction.LOGIN, at=datetime(2026, 9, 1, 23, 30))       # still 1 Sep in Vietnam
    log(AuditAction.LOGOUT, at=datetime(2026, 9, 2, 0, 15))
    log(AuditAction.EXPORT_DATA, at=datetime(2026, 9, 3, 12))

    assert actions(admin_client, **{'from': '2026-09-02', 'to': '2026-09-02'}) == ['LOGOUT']
    assert actions(admin_client, to='2026-09-01') == ['LOGIN']
    assert actions(admin_client, **{'from': '2026-09-02'}) == ['EXPORT_DATA', 'LOGOUT']


@pytest.mark.django_db
def test_bad_dates_are_400(admin_client):
    bad = admin_client.get(LIST_URL, {'from': '02/09/2026'})
    assert (bad.status_code, bad.data['code']) == (400, 'VALIDATION_ERROR')
    assert 'from' in bad.data['errors']

    reversed_range = admin_client.get(LIST_URL, {'from': '2026-09-05', 'to': '2026-09-01'})
    assert 'to' in reversed_range.data['errors']


@pytest.mark.django_db
def test_detail_and_404(admin_client):
    entry = log(AuditAction.LOGIN)

    response = admin_client.get(reverse('admin-audit-log-detail', args=[entry.pk]))
    assert (response.status_code, response.data['data']['details']) == (200, {'k': 1})
    assert admin_client.get(reverse('admin-audit-log-detail', args=[999])).status_code == 404


@pytest.mark.django_db
def test_log_is_read_only(admin_client):
    entry = log(AuditAction.LOGIN)

    assert admin_client.delete(reverse('admin-audit-log-detail', args=[entry.pk])).status_code == 405
    assert admin_client.post(LIST_URL, {}).status_code == 405
