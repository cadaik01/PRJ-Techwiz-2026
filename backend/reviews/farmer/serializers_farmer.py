from rest_framework import serializers

from reviews.services import REPLY_MAX_LENGTH


class ReplyReviewFarmerSerializer(serializers.Serializer):
    """FA-29 / FA-30 body: { reply: 1-500 characters }."""

    reply = serializers.CharField(min_length=1, max_length=REPLY_MAX_LENGTH)
