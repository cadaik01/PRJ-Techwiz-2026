"""
Module: notifications.serializers
Description: Serializers for the notifications app (MarketLink Pass 4B §3.6).
"""

from rest_framework import serializers

from notifications.models import Notification


class NotificationReadSerializer(serializers.ModelSerializer):
    """Also the shape of the WebSocket `data` field."""

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'target_url', 'is_read', 'read_at', 'created_at']
        read_only_fields = fields
