"""
Module: notifications.public.serializers_public
Description: Public announcement shape (Pass 4B §3.6 `Announcement`).
"""

from rest_framework import serializers

from notifications.models import Announcement


class AnnouncementReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'audience', 'starts_at', 'ends_at']
        read_only_fields = fields
