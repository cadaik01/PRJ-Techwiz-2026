"""
Module: manager.audit_logs.urls_admin
Description: /api/admin/audit-logs/ routes (AD-29, AD-30).
"""

from django.urls import path

from manager.audit_logs.views_admin import AuditLogAdminDetailView, AuditLogAdminListView

urlpatterns = [
    path('audit-logs/', AuditLogAdminListView.as_view(), name='admin-audit-log-list'),
    path('audit-logs/<int:pk>/', AuditLogAdminDetailView.as_view(), name='admin-audit-log-detail'),
]
