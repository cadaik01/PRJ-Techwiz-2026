"""
Module: manager.moderation.urls_admin
Description: Moderation routes (AD-20 -> AD-24).
"""

from django.urls import path

from manager.moderation.views_admin import (
    ProductModerationListView,
    ProductVisibilityView,
    ReviewModerationListView,
    ReviewVisibilityView,
)

urlpatterns = [
    path('products/', ProductModerationListView.as_view(), name='admin-product-list'),
    path('products/<int:pk>/hide/', ProductVisibilityView.as_view(hide=True), name='admin-product-hide'),
    path('products/<int:pk>/restore/', ProductVisibilityView.as_view(hide=False), name='admin-product-restore'),
    path('reviews/', ReviewModerationListView.as_view(), name='admin-review-list'),
]
for prefix, review_type in (('farmer-reviews', 'FARMER'), ('product-reviews', 'PRODUCT')):
    for action, hide in (('hide', True), ('restore', False)):
        urlpatterns.append(path(
            f'{prefix}/<int:pk>/{action}/', ReviewVisibilityView.as_view(review_type=review_type, hide=hide),
            name=f'admin-{prefix}-{action}',
        ))
