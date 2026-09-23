"""
Module: notifications.services
Description: Create, broadcast and mark notifications read.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from notifications.models import Notification, NotificationLevel
from notifications.serializers import NotificationReadSerializer

USER_GROUP = 'user_{user_id}'
ROLE_GROUP = 'role_{role}'
EVENT_NEW_NOTIFICATION = 'NEW_NOTIFICATION'


def _broadcast(group: str, notification: Notification) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        group,
        {
            'type': 'notify',
            'event': EVENT_NEW_NOTIFICATION,
            'data': NotificationReadSerializer(notification).data,
        },
    )


def push_notification(
    *,
    user_id: int,
    title: str,
    message: str = '',
    level: str = NotificationLevel.INFO,
    target_url: str = '',
) -> Notification:
    """Persist a notification, then broadcast it once the transaction commits.

    Deferring the broadcast means a rolled-back business operation never shows the
    user a notification for something that did not happen.
    """
    notification = Notification.objects.create(
        recipient_id=user_id,
        title=title,
        message=message,
        level=level,
        target_url=target_url,
    )
    transaction.on_commit(lambda: _broadcast(USER_GROUP.format(user_id=user_id), notification))
    return notification


def mark_notification_read(*, notification_id: int) -> None:
    Notification.objects.filter(id=notification_id).update(is_read=True)


def mark_all_notifications_read(*, recipient_id: int) -> int:
    return Notification.objects.filter(recipient_id=recipient_id, is_read=False).update(is_read=True)
