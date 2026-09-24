from django.conf import settings
from django.db import models

from marketlink_core.models import CreatedAtModel


class FavoriteFarmer(CreatedAtModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_farmers"
    )
    farmer = models.ForeignKey(
        "accounts.FarmerProfile", on_delete=models.RESTRICT, related_name="favorited_by"
    )

    class Meta:
        db_table = "favorite_farmers"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["customer", "farmer"], name="favf_uniq_customer_farmer"),
        ]


class FavoriteProduct(CreatedAtModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_products"
    )
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.RESTRICT, related_name="favorited_by"
    )

    class Meta:
        db_table = "favorite_products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product"], name="favp_product_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "product"], name="favp_uniq_customer_product"
            ),
        ]


class FavoriteMarket(CreatedAtModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_markets"
    )
    market = models.ForeignKey(
        "markets.Market", on_delete=models.RESTRICT, related_name="favorited_by"
    )

    class Meta:
        db_table = "favorite_markets"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["customer", "market"], name="favm_uniq_customer_market"),
        ]
