from django.urls import path

from reviews.admin_portal.views_admin import (
    FarmerReviewHideView,
    FarmerReviewRestoreView,
    ProductReviewHideView,
    ProductReviewRestoreView,
    ReviewModerationListView,
)

urlpatterns = [
    path("admin/reviews/", ReviewModerationListView.as_view(), name="admin-review-list"),
    path(
        "admin/farmer-reviews/<int:id>/hide/",
        FarmerReviewHideView.as_view(),
        name="admin-farmer-review-hide",
    ),
    path(
        "admin/farmer-reviews/<int:id>/restore/",
        FarmerReviewRestoreView.as_view(),
        name="admin-farmer-review-restore",
    ),
    path(
        "admin/product-reviews/<int:id>/hide/",
        ProductReviewHideView.as_view(),
        name="admin-product-review-hide",
    ),
    path(
        "admin/product-reviews/<int:id>/restore/",
        ProductReviewRestoreView.as_view(),
        name="admin-product-review-restore",
    ),
]
