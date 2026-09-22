"""
Module: notifications.models
Description: Durable record of every notification pushed to a user.

Rows are written before the WebSocket broadcast, so a recipient who was offline
still sees the notification when they next load the bell.
"""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class NotificationSeverity(models.TextChoices):
    NORMAL = 'normal', 'Normal'
    WARNING = 'warning', 'Warning'
    CRITICAL = 'critical', 'Critical'


class Notification(BaseModel):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        # Notifications belong to the account; removing the account removes them.
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    verb = models.CharField(max_length=64, db_index=True)
    severity = models.CharField(
        max_length=16,
        choices=NotificationSeverity.choices,
        default=NotificationSeverity.NORMAL,
    )
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f'{self.verb} -> {self.recipient_id}'
