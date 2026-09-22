"""Tests for the notifications app."""

import pytest
from django.urls import reverse

from notifications.models import NotificationSeverity
from notifications.services import push_notification


@pytest.mark.django_db
def test_push_persists_and_lists(auth_client, user):
    push_notification(user_id=user.pk, verb='task.assigned', payload={'task_id': 1})
    response = auth_client.get(reverse('notification-list'))

    assert response.status_code == 200
    assert response.data['success'] is True
    results = response.data['data']['results']
    assert results[0]['verb'] == 'task.assigned'
    assert results[0]['severity'] == NotificationSeverity.NORMAL


@pytest.mark.django_db
def test_cannot_read_another_users_notification(auth_client, admin_user):
    other = push_notification(user_id=admin_user.pk, verb='secret')
    response = auth_client.patch(reverse('notification-read', args=[other.pk]))

    # Scoped by recipient, so someone else's id is indistinguishable from a
    # missing row - no information about its existence leaks.
    assert response.status_code == 404
    other.refresh_from_db()
    assert other.is_read is False


@pytest.mark.django_db
def test_list_excludes_other_users_rows(auth_client, user, admin_user):
    push_notification(user_id=user.pk, verb='mine')
    push_notification(user_id=admin_user.pk, verb='theirs')

    results = auth_client.get(reverse('notification-list')).data['data']['results']
    assert [row['verb'] for row in results] == ['mine']


@pytest.mark.django_db
def test_read_all_marks_only_the_callers_rows(auth_client, user, admin_user):
    push_notification(user_id=user.pk, verb='mine')
    theirs = push_notification(user_id=admin_user.pk, verb='theirs')

    response = auth_client.patch(reverse('notification-read-all'))
    assert response.data['data']['updated'] == 1

    theirs.refresh_from_db()
    assert theirs.is_read is False
