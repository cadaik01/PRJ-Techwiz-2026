from django.urls import path

from catalog.public_portal.views_public import (
    PublicCategoryListView,
    PublicProductDetailView,
    PublicProductListView,
)
from reviews.public_portal.views_public import PublicProductReviewListView

urlpatterns = [
    path("public/categories/", PublicCategoryListView.as_view(), name="public-category-list"),
    path("public/products/", PublicProductListView.as_view(), name="public-product-list"),
    path(
        "public/products/<int:id>/",
        PublicProductDetailView.as_view(),
        name="public-product-detail",
    ),
    path(
        "public/products/<int:id>/reviews/",
        PublicProductReviewListView.as_view(),
        name="public-product-review-list",
    ),
]
