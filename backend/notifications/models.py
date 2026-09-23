"""
Module: notifications.models
Description: Durable record of every notification pushed to a user.

Rows are written before the WebSocket broadcast, so a recipient who was offline
still sees the notification when they next load the bell.
"""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class NotificationLevel(models.TextChoices):
    INFO = 'INFO', 'Info'
    SUCCESS = 'SUCCESS', 'Success'
    WARNING = 'WARNING', 'Warning'
    DANGER = 'DANGER', 'Danger'


class Notification(BaseModel):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        # A notification is a pure child row of its recipient.
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, default='')
    level = models.CharField(
        max_length=16,
        choices=NotificationLevel.choices,
        default=NotificationLevel.INFO,
    )
    target_url = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'notifications'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f'{self.title} -> {self.recipient_id}'
