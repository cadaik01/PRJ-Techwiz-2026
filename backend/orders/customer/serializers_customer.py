from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from orders.models import Order, OrderItem, OrderStatus


class CheckoutItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=999)


class CheckoutGroupWriteSerializer(serializers.Serializer):
    farmer_id = serializers.IntegerField(min_value=1)
    pickup_slot_id = serializers.IntegerField(min_value=1)
    pickup_date = serializers.DateField()
    note = serializers.CharField(max_length=300, required=False, allow_blank=True, allow_null=True)
    items = CheckoutItemWriteSerializer(many=True, allow_empty=False, max_length=50)

    def validate_items(self, items):
        product_ids = [item["product_id"] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Each product can appear only once per farmer")
        return items


class CheckoutWriteSerializer(serializers.Serializer):
    groups = CheckoutGroupWriteSerializer(many=True, allow_empty=False, max_length=5)

    def validate_groups(self, groups):
        farmer_ids = [group["farmer_id"] for group in groups]
        if len(farmer_ids) != len(set(farmer_ids)):
            raise serializers.ValidationError("Each farmer can appear only once")
        return groups


class OrderSummaryReadSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    farmer = serializers.SerializerMethodField()
    market = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    # Money is USD DECIMAL(10,2); DRF renders it as a string such as "12.50" to avoid float rounding.
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = Order
        fields = [
            "id", "status", "is_overdue", "version", "customer", "farmer", "market", "stall_label",
            "pickup_date", "pickup_start_at", "pickup_end_at", "cutoff_at", "item_count", "total_amount", "created_at",
        ]

    def get_is_overdue(self, order) -> bool:
        return order.status == OrderStatus.PLACED and timezone.now() >= order.pickup_start_at

    def get_customer(self, order) -> dict:
        profile = order.customer.customer_profile
        return {"id": order.customer_id, "full_name": profile.full_name, "phone": profile.phone}

    def get_farmer(self, order) -> dict:
        return {"id": order.farmer_id, "stall_name": order.farmer.stall_name, "phone": order.farmer.phone}

    def get_market(self, order) -> dict:
        market = order.market
        return {
            "id": market.id, "name": market.name, "address": market.address,
            "latitude": float(market.latitude), "longitude": float(market.longitude),
        }

    def get_item_count(self, order) -> int:
        annotated = getattr(order, "item_count", None)
        return annotated if annotated is not None else order.items.count()


class CustomerOrderItemModifySerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class CustomerOrderModifySerializer(serializers.Serializer):
    pickup_slot_id = serializers.IntegerField(required=False, allow_null=True)
    pickup_date = serializers.DateField(required=False, allow_null=True)
    note = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=300
    )
    items = CustomerOrderItemModifySerializer(many=True, required=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        slot_id = attrs.get("pickup_slot_id")
        p_date = attrs.get("pickup_date")

        if (slot_id is None and p_date is not None) or (slot_id is not None and p_date is None):
            raise serializers.ValidationError(
                "Both pickup_slot_id and pickup_date are required to reschedule pickup timing."
            )

        items = attrs.get("items")
        if items is not None:
            if len(items) == 0:
                raise serializers.ValidationError(
                    {
                        "items": "An order must contain at least one item. To cancel the order, please use cancel order."
                    }
                )
            pids = [item["product_id"] for item in items]
            if len(pids) != len(set(pids)):
                raise serializers.ValidationError(
                    {"items": "Duplicate products are not allowed in the items list."}
                )

        if not attrs:
            raise serializers.ValidationError("At least one field to update must be provided.")

        return attrs


class CustomerOrderItemDetailSerializer(serializers.ModelSerializer):
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


class CustomerOrderDetailSerializer(serializers.ModelSerializer):
    market_name = serializers.CharField(source="market.name", read_only=True)
    farmer_stall_name = serializers.CharField(source="farmer.stall_name", read_only=True)
    items = CustomerOrderItemDetailSerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "version",
            "market_name",
            "farmer_stall_name",
            "stall_label",
            "pickup_date",
            "pickup_start_at",
            "pickup_end_at",
            "cutoff_at",
            "note",
            "total_amount",
            "items",
            "allowed_actions",
            "created_at",
            "updated_at",
        ]

    def get_allowed_actions(self, obj: Order) -> list[str]:
        actions: list[str] = []
        now = timezone.now()
        if obj.status in (OrderStatus.PLACED, OrderStatus.ACCEPTED) and now < obj.cutoff_at:
            actions.append("MODIFY")
            actions.append("CANCEL")
        return actions
