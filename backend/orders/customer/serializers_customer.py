from django.utils import timezone
from rest_framework import serializers

from orders.models import Order, OrderStatus


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
    total_amount = serializers.IntegerField()

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
        return order.items.count()
