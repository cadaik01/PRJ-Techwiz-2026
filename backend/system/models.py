"""
Module: system.models
Description: Append-only security log for the Super Admin (table audit_logs).
"""

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models


class AuditAction(models.TextChoices):
    LOGIN = 'LOGIN', 'Login'
    LOGOUT = 'LOGOUT', 'Logout'
    CHANGE_PASSWORD = 'CHANGE_PASSWORD', 'Change password'
    EXPORT_DATA = 'EXPORT_DATA', 'Export data'
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS', 'Unauthorized access'


class AuditLog(models.Model):
    # SET_NULL keeps the trace after the account is deleted.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=64, choices=AuditAction.choices, db_index=True)
    endpoint = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')
    status_code = models.PositiveSmallIntegerField()
    request_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    details = models.JSONField(default=dict, blank=True, encoder=DjangoJSONEncoder)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.action} {self.status_code} {self.endpoint}'
