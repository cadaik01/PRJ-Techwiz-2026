from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from catalog.services.stock import get_available_stock
from orders.models import Order, OrderItem, OrderStatus, OrderStatusHistory


class FarmerOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "unit",
            "unit_price",
            "quantity",
            "line_total",
        ]


class FarmerOrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = [
            "id",
            "from_status",
            "to_status",
            "transition",
            "actor_role",
            "change_reason",
            "created_at",
        ]


class FarmerOrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    market_name = serializers.CharField(source="market.name", read_only=True)
    pickup_slot_label = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    has_pending_change = serializers.SerializerMethodField()
    stock_warning = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_name",
            "customer_phone",
            "market_name",
            "stall_label",
            "pickup_date",
            "pickup_start_at",
            "pickup_end_at",
            "pickup_slot_label",
            "status",
            "total_amount",
            "item_count",
            "has_pending_change",
            "stock_warning",
            "created_at",
        ]

    def get_customer_name(self, obj: Order) -> str:
        profile = getattr(obj.customer, "customer_profile", None)
        return profile.full_name if profile else obj.customer.email

    def get_customer_phone(self, obj: Order) -> str:
        profile = getattr(obj.customer, "customer_profile", None)
        return profile.phone if profile else ""

    def get_pickup_slot_label(self, obj: Order) -> str:
        start = timezone.localtime(obj.pickup_start_at)
        end = timezone.localtime(obj.pickup_end_at)
        return f"{start:%H:%M}–{end:%H:%M}"

    def get_item_count(self, obj: Order) -> int:
        return obj.items.count()

    def get_has_pending_change(self, obj: Order) -> bool:
        return obj.pending_change is not None

    def get_stock_warning(self, obj: Order) -> bool:
        if obj.status != OrderStatus.PLACED:
            return False
        for item in obj.items.all():
            prod = getattr(item, "product", None)
            if prod and get_available_stock(product=prod) < item.quantity:
                return True
        return False


class FarmerOrderDetailSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    market = serializers.SerializerMethodField()
    pickup_slot = serializers.SerializerMethodField()
    items = FarmerOrderItemSerializer(many=True, read_only=True)
    status_history = FarmerOrderStatusHistorySerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "market",
            "stall_label",
            "pickup_date",
            "pickup_slot",
            "pickup_start_at",
            "pickup_end_at",
            "cutoff_at",
            "status",
            "total_amount",
            "note",
            "version",
            "items",
            "pending_change",
            "status_history",
            "allowed_actions",
            "created_at",
            "updated_at",
        ]

    def get_customer(self, obj: Order) -> dict[str, Any]:
        profile = getattr(obj.customer, "customer_profile", None)
        return {
            "id": obj.customer_id,
            "full_name": profile.full_name if profile else obj.customer.email,
            "phone": profile.phone if profile else "",
            "email": obj.customer.email,
        }

    def get_market(self, obj: Order) -> dict[str, Any]:
        return {
            "id": obj.market_id,
            "name": obj.market.name,
            "address": obj.market.address,
        }

    def get_pickup_slot(self, obj: Order) -> dict[str, Any] | None:
        slot = obj.pickup_slot
        if not slot:
            return None
        return {
            "id": slot.id,
            "start_time": slot.start_time.isoformat() if hasattr(slot.start_time, "isoformat") else str(slot.start_time),
            "end_time": slot.end_time.isoformat() if hasattr(slot.end_time, "isoformat") else str(slot.end_time),
        }

    def get_allowed_actions(self, obj: Order) -> list[str]:
        actions: list[str] = []
        now = timezone.now()
        if obj.status == OrderStatus.PLACED:
            actions.extend(["ACCEPT", "DECLINE"])
        elif obj.status == OrderStatus.ACCEPTED:
            if obj.pending_change:
                actions.extend(["APPROVE_CHANGE", "REJECT_CHANGE", "DECLINE"])
            else:
                if now >= obj.cutoff_at:
                    actions.append("READY")
                actions.append("DECLINE")
                if now > obj.pickup_end_at:
                    actions.append("NO_SHOW")
        elif obj.status == OrderStatus.READY_FOR_PICKUP:
            actions.append("COMPLETE")
            if now > obj.pickup_end_at:
                actions.append("NO_SHOW")
        return actions


class DeclineOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500)
    mark_sold_out_product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )


class RejectChangeRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)


class PrepListItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    unit = serializers.CharField()
    total_quantity = serializers.IntegerField()
    order_count = serializers.IntegerField()
