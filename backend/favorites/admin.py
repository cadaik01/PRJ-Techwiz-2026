"""
Module: favorites.admin
Description: Django admin for favorites.
"""

from django.contrib import admin

from favorites.models import FavoriteFarmer, FavoriteMarket, FavoriteProduct


@admin.register(FavoriteFarmer)
class FavoriteFarmerAdmin(admin.ModelAdmin):
    list_display = ('customer', 'farmer', 'created_at')


@admin.register(FavoriteProduct)
class FavoriteProductAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'created_at')


@admin.register(FavoriteMarket)
class FavoriteMarketAdmin(admin.ModelAdmin):
    list_display = ('customer', 'market', 'created_at')
