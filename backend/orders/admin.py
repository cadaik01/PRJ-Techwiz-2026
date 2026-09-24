"""
Module: orders.admin
Description: Read-only Django admin for orders. State changes go through the FSM services.
"""

from django.contrib import admin

from orders.models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ('product', 'product_name', 'unit', 'unit_price', 'quantity', 'line_total')


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ('from_status', 'to_status', 'transition', 'actor', 'actor_role',
                       'change_reason', 'request_id', 'created_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'farmer', 'market', 'pickup_date', 'status', 'total_amount', 'version')
    list_filter = ('status', 'market')
    list_select_related = ('customer', 'farmer', 'market')
    search_fields = ('id', 'customer__email', 'farmer__stall_name')
    inlines = (OrderItemInline, OrderStatusHistoryInline)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
