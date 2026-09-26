from rest_framework import serializers

from reviews.display import short_customer_name
from reviews.models import FarmerReview, ProductReview


class ReviewWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)

    def validate_comment(self, value: str | None) -> str | None:
        return (value.strip() or None) if value else None


class CustomerReviewReadSerializer(serializers.Serializer):
    """Pass 4B §3.5 Review, as the customer sees it (no order_id / moderation fields)."""

    id = serializers.IntegerField()
    type = serializers.SerializerMethodField()
    rating = serializers.IntegerField()
    comment = serializers.CharField(allow_null=True)
    customer_display_name = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    reply = serializers.CharField(allow_null=True)
    replied_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()

    @staticmethod
    def _order(review):
        return review.order_item.order if isinstance(review, ProductReview) else review.order

    def get_type(self, review) -> str:
        return "PRODUCT" if isinstance(review, ProductReview) else "FARMER"

    def get_customer_display_name(self, review) -> str:
        return short_customer_name(self._order(review).customer.customer_profile.full_name)

    def get_product(self, review) -> dict | None:
        if isinstance(review, FarmerReview):
            return None
        item = review.order_item
        return {"id": item.product_id, "name": item.product_name}
