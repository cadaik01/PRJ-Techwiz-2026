from django.conf import settings
from django.db import models
from django.db.models import Q

from marketlink_core.models import BaseModel


class ReviewFields(BaseModel):
    rating = models.PositiveSmallIntegerField()
    comment = models.CharField(max_length=1000, null=True, blank=True)
    reply = models.CharField(max_length=500, null=True, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    is_hidden_by_admin = models.BooleanField(default=False)
    hidden_reason = models.CharField(max_length=500, null=True, blank=True)
    hidden_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class ProductReview(ReviewFields):
    order_item = models.OneToOneField(
        "orders.OrderItem", on_delete=models.RESTRICT, related_name="product_review"
    )
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hidden_product_reviews",
    )

    class Meta:
        db_table = "product_reviews"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_hidden_by_admin", "created_at"], name="prev_hidden_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(rating__gte=1, rating__lte=5), name="prev_rating_1_5"
            ),
        ]

    def __str__(self) -> str:
        return f"ProductReview #{self.order_item_id} ({self.rating}★)"


class FarmerReview(ReviewFields):
    order = models.OneToOneField(
        "orders.Order", on_delete=models.RESTRICT, related_name="farmer_review"
    )
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hidden_farmer_reviews",
    )

    class Meta:
        db_table = "farmer_reviews"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_hidden_by_admin", "created_at"], name="frev_hidden_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(rating__gte=1, rating__lte=5), name="frev_rating_1_5"
            ),
        ]

    def __str__(self) -> str:
        return f"FarmerReview #{self.order_id} ({self.rating}★)"
