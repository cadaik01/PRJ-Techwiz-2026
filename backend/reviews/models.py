"""
Module: reviews.models
Description: product_reviews and farmer_reviews (MarketLink Pass 4A §3.5, D-016).

Reviews hang off a completed order line / order, so product, farmer and customer are
derived through the order rather than stored again (3NF, DB-04).
"""

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel

RATING_RANGE = Q(rating__gte=1, rating__lte=5)


class ReviewBase(BaseModel):
    rating = models.PositiveSmallIntegerField()
    comment = models.CharField(max_length=1000, null=True, blank=True)
    # The farmer may reply once.
    reply = models.CharField(max_length=500, null=True, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    # Moderation hides instead of deleting.
    is_hidden_by_admin = models.BooleanField(default=False)
    hidden_reason = models.CharField(max_length=500, null=True, blank=True)
    hidden_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class ProductReview(ReviewBase):
    order_item = models.OneToOneField(
        'orders.OrderItem', on_delete=models.RESTRICT, related_name='product_review',
    )
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hidden_product_reviews',
    )

    class Meta:
        db_table = 'product_reviews'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['is_hidden_by_admin', 'created_at'], name='product_reviews_visible_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=RATING_RANGE, name='product_reviews_rating_range'),
        ]

    def __str__(self):
        return f'item {self.order_item_id}: {self.rating}'


class FarmerReview(ReviewBase):
    order = models.OneToOneField('orders.Order', on_delete=models.RESTRICT, related_name='farmer_review')
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hidden_farmer_reviews',
    )

    class Meta:
        db_table = 'farmer_reviews'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['is_hidden_by_admin', 'created_at'], name='farmer_reviews_visible_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=RATING_RANGE, name='farmer_reviews_rating_range'),
        ]

    def __str__(self):
        return f'order {self.order_id}: {self.rating}'
