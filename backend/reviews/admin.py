"""
Module: reviews.admin
Description: Django admin for reviews.
"""

from django.contrib import admin

from reviews.models import FarmerReview, ProductReview


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_item', 'rating', 'is_hidden_by_admin', 'created_at')
    list_filter = ('rating', 'is_hidden_by_admin')


@admin.register(FarmerReview)
class FarmerReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'rating', 'is_hidden_by_admin', 'created_at')
    list_filter = ('rating', 'is_hidden_by_admin')
