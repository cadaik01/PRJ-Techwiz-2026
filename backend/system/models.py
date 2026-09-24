"""
Module: system.models
Description: Append-only security log for the Super Admin (MarketLink Pass 4A §3.8).
"""

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models


class AuditAction(models.TextChoices):
    LOGIN = 'LOGIN', 'Đăng nhập'
    LOGIN_FAILED = 'LOGIN_FAILED', 'Đăng nhập thất bại'
    LOGOUT = 'LOGOUT', 'Đăng xuất'
    PASSWORD_CHANGED = 'PASSWORD_CHANGED', 'Đổi mật khẩu'
    ACCESS_DENIED = 'ACCESS_DENIED', 'Truy cập trái quyền'
    EXPORT_DATA = 'EXPORT_DATA', 'Xuất dữ liệu'
    FARMER_APPROVED = 'FARMER_APPROVED', 'Duyệt nông dân'
    FARMER_REJECTED = 'FARMER_REJECTED', 'Từ chối nông dân'
    FARMER_SUSPENDED = 'FARMER_SUSPENDED', 'Đình chỉ nông dân'
    FARMER_REINSTATED = 'FARMER_REINSTATED', 'Khôi phục nông dân'
    CUSTOMER_DEACTIVATED = 'CUSTOMER_DEACTIVATED', 'Khóa khách hàng'
    CUSTOMER_ACTIVATED = 'CUSTOMER_ACTIVATED', 'Kích hoạt khách hàng'
    PRODUCT_HIDDEN = 'PRODUCT_HIDDEN', 'Gỡ sản phẩm'
    PRODUCT_RESTORED = 'PRODUCT_RESTORED', 'Khôi phục sản phẩm'
    REVIEW_HIDDEN = 'REVIEW_HIDDEN', 'Ẩn đánh giá'
    REVIEW_RESTORED = 'REVIEW_RESTORED', 'Hiện lại đánh giá'


class AuditLog(models.Model):
    # SET_NULL keeps the trace after the account is deleted; NULL for failed logins
    # with an unknown email.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=40, choices=AuditAction.choices)
    endpoint = models.CharField(max_length=255, null=True, blank=True)
    method = models.CharField(max_length=10, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    request_id = models.CharField(max_length=36, null=True, blank=True)
    details = models.JSONField(default=dict, blank=True, encoder=DjangoJSONEncoder)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['action', 'created_at'], name='audit_logs_action_idx'),
            models.Index(fields=['user', 'created_at'], name='audit_logs_user_idx'),
        ]

    def __str__(self):
        return f'{self.action} {self.status_code} {self.endpoint}'
