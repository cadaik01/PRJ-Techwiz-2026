"""
Module: catalog.admin_api.urls_admin
Description: /api/admin/ routes of the catalog app.
"""

from django.urls import path

from catalog.admin_api.views_admin import CategoryAdminDetailView, CategoryAdminListView

urlpatterns = [
    path('categories/', CategoryAdminListView.as_view(), name='admin-category-list'),
    path('categories/<int:pk>/', CategoryAdminDetailView.as_view(), name='admin-category-detail'),
]
