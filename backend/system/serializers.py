from rest_framework import serializers

from accounts.admin_portal.serializers_admin import AdminFarmerRowSerializer
from accounts.models import CustomUser
from orders.models import OrderStatus
from system.models import AuditLog


class AuditLogActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "email"]
        read_only_fields = fields


class AuditLogReadSerializer(serializers.ModelSerializer):
    user = AuditLogActorSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "action",
            "endpoint",
            "method",
            "ip_address",
            "user_agent",
            "status_code",
            "request_id",
            "details",
            "created_at",
        ]
        read_only_fields = fields


class DashboardTotalsSerializer(serializers.Serializer):
    farmers = serializers.IntegerField()
    farmers_pending = serializers.IntegerField()
    customers = serializers.IntegerField()
    markets_active = serializers.IntegerField()
    orders = serializers.IntegerField()


class OrdersByDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class OrdersByStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)
    count = serializers.IntegerField()


class DashboardSerializer(serializers.Serializer):
    totals = DashboardTotalsSerializer()
    orders_by_day = OrdersByDaySerializer(many=True)
    orders_by_status = OrdersByStatusSerializer(many=True)
    pending_farmers = AdminFarmerRowSerializer(many=True)


class RevenueByMarketSerializer(serializers.Serializer):
    market_id = serializers.IntegerField()
    market_name = serializers.CharField()
    completed_orders = serializers.IntegerField()
    revenue = serializers.CharField()


class TopFarmerSerializer(serializers.Serializer):
    farmer_id = serializers.IntegerField()
    stall_name = serializers.CharField()
    completed_orders = serializers.IntegerField()
    revenue = serializers.CharField()
    rating_avg = serializers.FloatField(allow_null=True)


class ReportSummarySerializer(serializers.Serializer):
    orders_by_status = OrdersByStatusSerializer(many=True)
    revenue_by_market = RevenueByMarketSerializer(many=True)
    top_farmers = TopFarmerSerializer(many=True)
