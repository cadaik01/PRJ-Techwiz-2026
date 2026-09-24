"""
Module: notifications.models
Description: notifications and announcements (MarketLink Pass 4A §3.7, D-010).

Notification rows are written before the WebSocket broadcast, so a recipient who was
offline still sees them when the bell next loads.
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from core.models import BaseModel


class NotificationType(models.TextChoices):
    # Customer
    ORDER_ACCEPTED = 'ORDER_ACCEPTED', 'Đơn đã được xác nhận'
    ORDER_READY = 'ORDER_READY', 'Đơn sẵn sàng nhận'
    ORDER_DECLINED = 'ORDER_DECLINED', 'Đơn bị từ chối'
    ORDER_EXPIRED = 'ORDER_EXPIRED', 'Đơn đã hết hạn'
    RESTOCK = 'RESTOCK', 'Sản phẩm yêu thích có hàng lại'
    # Farmer
    ORDER_PLACED = 'ORDER_PLACED', 'Đơn mới'
    ORDER_MODIFIED = 'ORDER_MODIFIED', 'Khách sửa đơn'
    ORDER_CANCELLED = 'ORDER_CANCELLED', 'Khách hủy đơn'
    ORDER_CANCELLED_CUSTOMER_LOCKED = 'ORDER_CANCELLED_CUSTOMER_LOCKED', 'Đơn bị hủy do khách bị khóa'
    ACCOUNT_STATUS_CHANGED = 'ACCOUNT_STATUS_CHANGED', 'Trạng thái tài khoản thay đổi'


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        # A notification is a pure child row of its recipient.
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=40, choices=NotificationType.choices)
    title = models.CharField(max_length=150)
    message = models.CharField(max_length=500)
    target_url = models.CharField(max_length=255, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at'], name='notifications_inbox_idx'),
        ]

    def __str__(self):
        return f'{self.type} -> {self.recipient_id}'


class AnnouncementAudience(models.TextChoices):
    ALL = 'ALL', 'Tất cả'
    CUSTOMER = 'CUSTOMER', 'Khách hàng'
    FARMER = 'FARMER', 'Nông dân'


class Announcement(BaseModel):
    title = models.CharField(max_length=150)
    content = models.CharField(max_length=1000)
    audience = models.CharField(max_length=20, choices=AnnouncementAudience.choices, default=AnnouncementAudience.ALL)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
    )

    class Meta:
        db_table = 'announcements'
        ordering = ('-starts_at',)
        indexes = [
            models.Index(fields=['is_active', 'audience', 'starts_at'], name='announcements_live_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gt=F('starts_at')),
                name='announcements_ends_after_start',
            ),
        ]

    def __str__(self):
        return self.title
