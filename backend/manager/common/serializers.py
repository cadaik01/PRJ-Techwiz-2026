"""
Module: manager.common.serializers
Description: Order shapes admin screens share (Pass 4B §3.4 `OrderSummary`).
"""

from django.db.models import Count, QuerySet
from django.utils import timezone
from rest_framework import serializers

from orders.models import Order, OrderStatus


def order_summaries(queryset: QuerySet[Order]) -> QuerySet[Order]:
    return queryset.select_related('customer__customer_profile', 'farmer', 'market').annotate(
        item_count=Count('items'),
    )


class OrderSummarySerializer(serializers.ModelSerializer):
    """Needs the annotation from order_summaries()."""

    is_overdue = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    farmer = serializers.SerializerMethodField()
    market = serializers.SerializerMethodField()
    item_count = serializers.IntegerField()
    total_amount = serializers.IntegerField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'is_overdue', 'version', 'customer', 'farmer', 'market', 'stall_label',
            'pickup_date', 'pickup_start_at', 'pickup_end_at', 'cutoff_at', 'item_count', 'total_amount',
            'created_at',
        ]
        read_only_fields = fields

    def get_is_overdue(self, order) -> bool:
        # PLACED past pickup start but not yet swept to EXPIRED (D-009).
        return order.status == OrderStatus.PLACED and timezone.now() >= order.pickup_start_at

    def get_customer(self, order) -> dict:
        profile = getattr(order.customer, 'customer_profile', None)
        return {'id': order.customer_id, 'full_name': getattr(profile, 'full_name', ''),
                'phone': getattr(profile, 'phone', '')}

    def get_farmer(self, order) -> dict:
        return {'id': order.farmer_id, 'stall_name': order.farmer.stall_name, 'phone': order.farmer.phone}

    def get_market(self, order) -> dict:
        market = order.market
        return {'id': market.id, 'name': market.name, 'address': market.address,
                'latitude': float(market.latitude), 'longitude': float(market.longitude)}


REASON_MESSAGE = 'Vui lòng nhập lý do (5–500 ký tự)'


class ReasonWriteSerializer(serializers.Serializer):
    """Body of reject / suspend / deactivate / hide actions (Pass 3 §1.5: 5–500 characters)."""

    reason = serializers.CharField(
        min_length=5, max_length=500,
        error_messages={key: REASON_MESSAGE for key in ('min_length', 'max_length', 'blank', 'required', 'null')},
    )


def short_customer_name(full_name: str) -> str:
    """"Nguyễn Văn A" -> "Nguyễn V. A." (U-05)."""
    first, *others = (full_name or '').split() or ['Khách']
    return ' '.join([first, *(f'{part[0]}.' for part in others)])
