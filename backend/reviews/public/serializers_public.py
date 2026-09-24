"""
Module: reviews.public.serializers_public
Description: Public `Review` and `RatingSummary` (Pass 4B §3.5): no order id and no
             moderation fields, customer name shortened (U-05).
"""

from django.db.models import Avg, Count, QuerySet
from rest_framework import serializers

from manager.common.serializers import short_customer_name
from reviews.models import FarmerReview, ProductReview


class ReviewPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    type = serializers.SerializerMethodField()
    rating = serializers.IntegerField()
    comment = serializers.CharField(allow_null=True)
    customer_display_name = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    reply = serializers.CharField(allow_null=True)
    replied_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()

    def get_type(self, review) -> str:
        return 'FARMER' if isinstance(review, FarmerReview) else 'PRODUCT'

    def get_customer_display_name(self, review) -> str:
        order = review.order if isinstance(review, FarmerReview) else review.order_item.order
        return short_customer_name(getattr(getattr(order.customer, 'customer_profile', None), 'full_name', ''))

    def get_product(self, review):
        if isinstance(review, ProductReview):
            return {'id': review.order_item.product_id, 'name': review.order_item.product_name}
        return None


def rating_summary(reviews: QuerySet) -> dict:
    """RatingSummary over visible reviews: average, count and a 1-5 distribution."""
    totals = reviews.aggregate(avg=Avg('rating'), count=Count('id'))
    per_star = dict(reviews.order_by().values_list('rating').annotate(n=Count('id')))
    return {
        'rating_avg': None if totals['avg'] is None else round(float(totals['avg']), 1),
        'rating_count': totals['count'],
        'distribution': {str(star): per_star.get(star, 0) for star in range(1, 6)},
    }
