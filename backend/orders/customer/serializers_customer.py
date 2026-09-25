from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from orders.models import Order, OrderItem, OrderStatus


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
