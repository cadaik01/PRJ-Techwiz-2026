"""
Module: manager.moderation.serializers_admin
Description: `Review` as admins see it (Pass 4B §3.5), for both review tables.
"""

from rest_framework import serializers

from manager.common.serializers import short_customer_name
from reviews.models import FarmerReview, ProductReview


class ReviewAdminSerializer(serializers.Serializer):
    """Works on FarmerReview and ProductReview; type follows the instance."""

    id = serializers.IntegerField()
    type = serializers.SerializerMethodField()
    rating = serializers.IntegerField()
    comment = serializers.CharField(allow_null=True)
    customer_display_name = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    reply = serializers.CharField(allow_null=True)
    replied_at = serializers.DateTimeField(allow_null=True)
    is_hidden_by_admin = serializers.BooleanField()
    hidden_reason = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()

    @staticmethod
    def _order(review):
        return review.order if isinstance(review, FarmerReview) else review.order_item.order

    def get_type(self, review) -> str:
        return 'FARMER' if isinstance(review, FarmerReview) else 'PRODUCT'

    def get_customer_display_name(self, review) -> str:
        profile = getattr(self._order(review).customer, 'customer_profile', None)
        return short_customer_name(getattr(profile, 'full_name', ''))

    def get_product(self, review):
        if isinstance(review, ProductReview):
            return {'id': review.order_item.product_id, 'name': review.order_item.product_name}
        return None

    def get_order_id(self, review) -> int:
        return self._order(review).id


def reviews_with_relations(model):
    if model is FarmerReview:
        return FarmerReview.objects.select_related('order__customer__customer_profile')
    return ProductReview.objects.select_related('order_item__order__customer__customer_profile')
