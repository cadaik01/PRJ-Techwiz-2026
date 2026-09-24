"""
Module: manager.dashboard.urls_admin
Description: /api/admin/dashboard/ (AD-01).
"""

from django.urls import path

from manager.dashboard.views_admin import DashboardAdminView

urlpatterns = [
    path('dashboard/', DashboardAdminView.as_view(), name='admin-dashboard'),
]
