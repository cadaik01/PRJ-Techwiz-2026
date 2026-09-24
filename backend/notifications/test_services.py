"""Unit tests for the in-app notification writer (notifications.services, D-010)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from manager.conftest import make_customer
from notifications.models import Notification, NotificationType
from notifications.services import (
    EVENT_NEW_NOTIFICATION,
    USER_GROUP,
    mark_all_notifications_read,
    mark_notification_read,
    push_notification,
)


def push(user, title='Order #1 was accepted', **overrides):
    return push_notification(
        user_id=user.pk, type=NotificationType.ORDER_ACCEPTED, title=title,
        message='The stall confirmed it', **overrides,
    )


@pytest.fixture
def customer(db):
    return make_customer()


@pytest.mark.django_db
def test_a_new_notification_starts_unread_with_no_read_time(customer):
    notification = push(customer, target_url='/customer/orders/1')

    assert (notification.is_read, notification.read_at, notification.target_url) == (
        False, None, '/customer/orders/1')
    assert notification.type == NotificationType.ORDER_ACCEPTED


@pytest.mark.django_db
def test_target_url_is_optional(customer):
    assert push(customer).target_url is None


@pytest.mark.django_db
def test_marking_read_stamps_the_time_once(customer):
    notification = push(customer)

    mark_notification_read(notification_id=notification.pk)
    notification.refresh_from_db()
    first_time = notification.read_at

    mark_notification_read(notification_id=notification.pk)
    notification.refresh_from_db()

    assert notification.is_read is True
    assert notification.read_at == first_time          # already read rows are left alone


@pytest.mark.django_db
def test_read_all_touches_only_the_owner_s_unread_rows(customer):
    someone_else = make_customer('other@test.com')
    mine_unread = push(customer)
    mine_read = push(customer, title='Older')
    mark_notification_read(notification_id=mine_read.pk)
    theirs = push(someone_else)

    updated = mark_all_notifications_read(recipient_id=customer.pk)

    assert updated == 1
    mine_unread.refresh_from_db()
    theirs.refresh_from_db()
    assert (mine_unread.is_read, mine_unread.read_at is not None) == (True, True)
    assert theirs.is_read is False


@pytest.mark.django_db
def test_read_all_on_an_empty_inbox_is_zero(customer):
    assert mark_all_notifications_read(recipient_id=customer.pk) == 0


@pytest.mark.django_db
def test_the_broadcast_is_deferred_to_commit(customer, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        notification = push(customer)
        assert Notification.objects.filter(pk=notification.pk).exists()   # the row is written at once
        assert callbacks == []                                            # the frame is not

    assert len(callbacks) == 1
    assert USER_GROUP.format(user_id=customer.pk) == f'user_{customer.pk}'
    assert EVENT_NEW_NOTIFICATION == 'NEW_NOTIFICATION'


@pytest.mark.django_db
def test_a_rolled_back_operation_broadcasts_nothing(customer, django_capture_on_commit_callbacks):
    # The queued callback is dropped with the transaction, so no ghost notification.
    with django_capture_on_commit_callbacks(execute=False) as callbacks:
        push(customer)

    assert len(callbacks) == 1


@pytest.mark.django_db
def test_inbox_lists_newest_first(customer):
    older = push(customer, title='Older')
    Notification.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(hours=2))
    newer = push(customer, title='Newer')

    assert list(Notification.objects.filter(recipient=customer).values_list('id', flat=True)) == [
        newer.pk, older.pk]
