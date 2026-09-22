"""
Module: notifications.services
Description: Fan-out helper for pushing a notification to a user.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification, NotificationSeverity

GROUP = 'user.{user_id}'


def push_notification(*, user_id, verb, payload=None, severity=NotificationSeverity.NORMAL):
    """Persist a notification, then broadcast it to that user's channel group.

    The database write comes first so an offline recipient still has the row; the
    broadcast is best-effort on top of it.
    """
    notification = Notification.objects.create(
        recipient_id=user_id,
        verb=verb,
        severity=severity,
        payload=payload or {},
    )

    layer = get_channel_layer()
    if layer is not None:
        async_to_sync(layer.group_send)(
            GROUP.format(user_id=user_id),
            {
                'type': 'notify',
                'data': {
                    'id': notification.pk,
                    'verb': notification.verb,
                    'severity': notification.severity,
                    'payload': notification.payload,
                    'created_at': notification.created_at.isoformat(),
                },
            },
        )
    return notification
