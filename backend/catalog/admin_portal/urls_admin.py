from django.urls import path

from catalog.admin_portal.views_admin import (
    CategoryDetailView,
    CategoryListCreateView,
    ProductHideView,
    ProductModerationListView,
    ProductRestoreView,
)

urlpatterns = [
    path("admin/categories/", CategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/<int:id>/", CategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/products/", ProductModerationListView.as_view(), name="admin-product-list"),
    path("admin/products/<int:id>/hide/", ProductHideView.as_view(), name="admin-product-hide"),
    path(
        "admin/products/<int:id>/restore/",
        ProductRestoreView.as_view(),
        name="admin-product-restore",
    ),
]
