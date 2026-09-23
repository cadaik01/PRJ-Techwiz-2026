"""
Module: system.admin
Description: Read-only Django admin for the security log.
"""

from django.contrib import admin

from system.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'action', 'status_code', 'user', 'endpoint', 'ip_address')
    list_filter = ('action', 'status_code')
    search_fields = ('user__email', 'endpoint', 'request_id')
    list_select_related = ('user',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
