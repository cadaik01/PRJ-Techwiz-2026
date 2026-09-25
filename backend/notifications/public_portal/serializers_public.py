from rest_framework import serializers

from notifications.models import Announcement


class AnnouncementPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "audience", "starts_at", "ends_at"]
        read_only_fields = fields
