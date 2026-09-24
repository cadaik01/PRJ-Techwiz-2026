"""
Module: favorites.models
Description: favorite_farmers, favorite_products, favorite_markets
             (MarketLink Pass 4A §3.6, D-019). Rows are only added or removed,
             so there is no updated_at.
"""

from django.conf import settings
from django.db import models


class FavoriteFarmer(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorite_farmers',
    )
    farmer = models.ForeignKey('accounts.FarmerProfile', on_delete=models.RESTRICT, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorite_farmers'
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(fields=['customer', 'farmer'], name='favorite_farmers_unique_pair'),
        ]


class FavoriteProduct(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorite_products',
    )
    # Indexed through the FK: finds who to notify on restock.
    product = models.ForeignKey('catalog.Product', on_delete=models.RESTRICT, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorite_products'
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(fields=['customer', 'product'], name='favorite_products_unique_pair'),
        ]


class FavoriteMarket(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorite_markets',
    )
    market = models.ForeignKey('markets.Market', on_delete=models.RESTRICT, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorite_markets'
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(fields=['customer', 'market'], name='favorite_markets_unique_pair'),
        ]
