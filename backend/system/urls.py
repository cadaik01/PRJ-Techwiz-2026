"""
Module: system.urls
Description: Admin routes for the security log, mounted under /api/.
"""

from django.urls import path

from system.views import AuditLogAdminListView

urlpatterns = [
    path('admin/audit-logs/', AuditLogAdminListView.as_view(), name='admin-audit-log-list'),
]
