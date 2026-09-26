from rest_framework import serializers

from reviews.display import short_customer_name
from reviews.models import FarmerReview
from reviews.selectors import ReviewType

REASON_MIN_LENGTH = 5
REASON_MAX_LENGTH = 500


class ReviewReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=REASON_MIN_LENGTH, max_length=REASON_MAX_LENGTH)


class ReviewAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    type = serializers.ChoiceField(choices=ReviewType.choices, read_only=True)
    rating = serializers.IntegerField(read_only=True)
    comment = serializers.CharField(read_only=True, allow_null=True)
    customer_display_name = serializers.CharField(read_only=True)
    product = serializers.DictField(read_only=True, allow_null=True)
    order_id = serializers.IntegerField(read_only=True)
    reply = serializers.CharField(read_only=True, allow_null=True)
    replied_at = serializers.DateTimeField(read_only=True, allow_null=True)
    is_hidden_by_admin = serializers.BooleanField(read_only=True)
    hidden_reason = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)


def serialize_review(review_type: str, review) -> dict:
    if isinstance(review, FarmerReview):
        order = review.order
        product = None
    else:
        order = review.order_item.order
        product = {"id": review.order_item.product_id, "name": review.order_item.product.name}
    profile = getattr(order.customer, "customer_profile", None)
    return {
        "id": review.pk,
        "type": review_type,
        "rating": review.rating,
        "comment": review.comment,
        "customer_display_name": short_customer_name(getattr(profile, "full_name", None)),
        "product": product,
        "order_id": order.pk,
        "reply": review.reply,
        "replied_at": review.replied_at,
        "is_hidden_by_admin": review.is_hidden_by_admin,
        "hidden_reason": review.hidden_reason,
        "created_at": review.created_at,
    }
