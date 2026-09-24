"""
Module: orders.models
Description: orders, order_items, order_status_history
             (MarketLink Pass 4A §3.4, D-004 → D-007, FSM A-002).
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from core.models import BaseModel


class OrderStatus(models.TextChoices):
    PLACED = 'PLACED', 'Chờ duyệt'
    ACCEPTED = 'ACCEPTED', 'Đã xác nhận'
    READY_FOR_PICKUP = 'READY_FOR_PICKUP', 'Sẵn sàng nhận'
    COMPLETED = 'COMPLETED', 'Hoàn tất'
    CANCELLED = 'CANCELLED', 'Đã hủy'
    DECLINED = 'DECLINED', 'Bị từ chối'
    NO_SHOW = 'NO_SHOW', 'Khách không đến'
    EXPIRED = 'EXPIRED', 'Đã hết hạn'


# Open orders hold stock; every other status is terminal.
OPEN_STATUSES = (OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP)


class Transition(models.TextChoices):
    """The 13 edges of the order FSM (A-002 §3)."""

    T1 = 'T1', 'Tạo đơn → PLACED'
    T2 = 'T2', 'PLACED → ACCEPTED'
    T3 = 'T3', 'PLACED → DECLINED'
    T4 = 'T4', 'ACCEPTED → DECLINED'
    T5 = 'T5', 'PLACED → CANCELLED'
    T6 = 'T6', 'ACCEPTED → CANCELLED'
    T7 = 'T7', 'ACCEPTED → PLACED'
    T8 = 'T8', 'PLACED → EXPIRED'
    T9 = 'T9', 'ACCEPTED → READY_FOR_PICKUP'
    T10 = 'T10', 'READY_FOR_PICKUP → COMPLETED'
    T11 = 'T11', 'READY_FOR_PICKUP → NO_SHOW'
    T12 = 'T12', 'READY_FOR_PICKUP → DECLINED'
    T13 = 'T13', 'READY_FOR_PICKUP → CANCELLED'


class ActorRole(models.TextChoices):
    CUSTOMER = 'CUSTOMER', 'Khách hàng'
    FARMER = 'FARMER', 'Nông dân'
    ADMIN = 'ADMIN', 'Quản trị viên'
    SYSTEM = 'SYSTEM', 'Hệ thống'


class ChangeReason(models.TextChoices):
    """System reason codes. Reasons typed by people are stored as free text."""

    SYSTEM_EXPIRED = 'SYSTEM_EXPIRED', 'Hệ thống tự hủy do quá giờ duyệt'
    FARMER_SUSPENDED_BY_ADMIN = 'FARMER_SUSPENDED_BY_ADMIN', 'Nông dân bị quản trị viên đình chỉ'
    CUSTOMER_LOCKED_BY_ADMIN = 'CUSTOMER_LOCKED_BY_ADMIN', 'Tài khoản khách bị quản trị viên khóa'


class Order(BaseModel):
    """One order per farmer (D-004). Pickup time, market and stall are snapshots (D-007, DB-01)."""

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='orders')
    farmer = models.ForeignKey('accounts.FarmerProfile', on_delete=models.RESTRICT, related_name='orders')
    market = models.ForeignKey('markets.Market', on_delete=models.RESTRICT, related_name='orders')
    pickup_slot = models.ForeignKey(
        'markets.PickupSlot', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders',
    )
    stall_label = models.CharField(max_length=30, null=True, blank=True)
    pickup_date = models.DateField()
    pickup_start_at = models.DateTimeField()
    pickup_end_at = models.DateTimeField()
    cutoff_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PLACED)
    note = models.CharField(max_length=300, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=0)
    # OCC (If-Match); incremented on every write, including T8, T12 and T13.
    version = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'orders'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['farmer', 'status', 'pickup_start_at'], name='orders_farmer_status_idx'),
            models.Index(fields=['customer', 'status'], name='orders_customer_status_idx'),
            models.Index(fields=['customer', 'farmer', 'status'], name='orders_customer_farmer_idx'),
            models.Index(fields=['status', 'pickup_start_at'], name='orders_status_pickup_idx'),
            models.Index(fields=['market', 'status', 'pickup_date'], name='orders_market_report_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(pickup_end_at__gt=F('pickup_start_at')), name='orders_pickup_end_after_start',
            ),
            models.CheckConstraint(
                condition=Q(cutoff_at__lte=F('pickup_start_at')), name='orders_cutoff_before_pickup',
            ),
            models.CheckConstraint(condition=Q(total_amount__gte=0), name='orders_total_non_negative'),
        ]

    def __str__(self):
        return f'#{self.pk}'


class OrderItem(BaseModel):
    """Name, unit and price are snapshots taken from the database at order time, never from the client."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('catalog.Product', on_delete=models.RESTRICT, related_name='order_items')
    product_name = models.CharField(max_length=100)
    unit = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=0)

    class Meta:
        db_table = 'order_items'
        ordering = ('id',)
        constraints = [
            models.UniqueConstraint(fields=['order', 'product'], name='order_items_unique_product'),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name='order_items_price_non_negative'),
            models.CheckConstraint(condition=Q(quantity__gte=1), name='order_items_quantity_min'),
        ]

    def __str__(self):
        return f'{self.order_id}:{self.product_name} x{self.quantity}'


class OrderStatusHistory(models.Model):
    """Append-only FSM audit trail, written in the same transaction as the order update (DB-06).

    Used instead of django-simple-history on orders: the timeline reads from/to status
    and actor directly, without diffing adjacent snapshots.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, choices=OrderStatus.choices, null=True, blank=True)
    to_status = models.CharField(max_length=20, choices=OrderStatus.choices)
    transition = models.CharField(max_length=10, choices=Transition.choices, null=True, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_status_actions',
    )
    actor_role = models.CharField(max_length=20, choices=ActorRole.choices)
    change_reason = models.TextField(null=True, blank=True)
    request_id = models.CharField(max_length=36, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        ordering = ('order', 'created_at')
        indexes = [
            models.Index(fields=['order', 'created_at'], name='order_history_timeline_idx'),
        ]

    def __str__(self):
        return f'{self.order_id}: {self.from_status} -> {self.to_status}'
