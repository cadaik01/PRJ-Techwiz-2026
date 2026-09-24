"""
Module: catalog.public.urls_public
Description: /api/public/ routes of the catalog app.
"""

from django.urls import path

from catalog.public.views_public import (
    CategoryPublicListView,
    ProductPublicDetailView,
    ProductPublicListView,
    ProductPublicReviewsView,
)

urlpatterns = [
    path('categories/', CategoryPublicListView.as_view(), name='public-category-list'),
    path('products/', ProductPublicListView.as_view(), name='public-product-list'),
    path('products/<int:pk>/', ProductPublicDetailView.as_view(), name='public-product-detail'),
    path('products/<int:pk>/reviews/', ProductPublicReviewsView.as_view(), name='public-product-reviews'),
]
