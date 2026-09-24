"""
Module: manager.categories.urls_admin
Description: /api/admin/categories/ routes (AD-18, AD-19).
"""

from django.urls import path

from manager.categories.views_admin import CategoryAdminDetailView, CategoryAdminListView

urlpatterns = [
    path('categories/', CategoryAdminListView.as_view(), name='admin-category-list'),
    path('categories/<int:pk>/', CategoryAdminDetailView.as_view(), name='admin-category-detail'),
]
