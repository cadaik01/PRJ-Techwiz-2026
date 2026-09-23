"""
Module: notifications.serializers
Description: Serializers for the notifications app.
"""

from rest_framework import serializers

from notifications.models import Notification


class NotificationReadSerializer(serializers.ModelSerializer):
    """Also the shape of the WebSocket `data` field."""

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'level', 'target_url', 'is_read', 'created_at']
        read_only_fields = fields
