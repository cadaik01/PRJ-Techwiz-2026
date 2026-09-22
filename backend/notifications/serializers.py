"""
Module: notifications.serializers
Description: Serializers for the notifications app.
"""

from rest_framework import serializers

from .models import Notification


class NotificationReadSerializer(serializers.ModelSerializer):
    """Shape returned by GET. Every field is output-only."""

    class Meta:
        model = Notification
        fields = ('id', 'verb', 'severity', 'payload', 'is_read', 'created_at')
        read_only_fields = fields
