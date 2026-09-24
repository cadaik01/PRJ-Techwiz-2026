"""
Module: manager.customers.serializers_admin
Description: Admin customer shapes (AD-09, AD-10).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class CustomerAdminRowSerializer(serializers.ModelSerializer):
    """AD-09 row. Needs the annotations from admin_customers()."""

    full_name = serializers.CharField(source='customer_profile.full_name', default='')
    phone = serializers.CharField(source='customer_profile.phone', default='')
    total_orders = serializers.IntegerField()
    open_orders = serializers.IntegerField()
    no_show_count = serializers.IntegerField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone', 'date_joined', 'is_active',
            'total_orders', 'open_orders', 'no_show_count',
        ]
        read_only_fields = fields


class CustomerAdminDetailSerializer(CustomerAdminRowSerializer):
    """AD-10: row + address + up to 10 recent orders (passed in context as `recent_orders`)."""

    address = serializers.CharField(source='customer_profile.address', default='')
    recent_orders = serializers.SerializerMethodField()

    class Meta(CustomerAdminRowSerializer.Meta):
        fields = [*CustomerAdminRowSerializer.Meta.fields, 'address', 'recent_orders']
        read_only_fields = fields

    def get_recent_orders(self, customer):
        return self.context['recent_orders']
