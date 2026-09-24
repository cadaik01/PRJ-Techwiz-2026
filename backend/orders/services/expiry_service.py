from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from catalog.models import Product
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import ActorRole, ChangeReason, Order, OrderItem, OrderStatus, Transition
from orders.services.history_service import record_status_change


def expire_overdue_orders(*, farmer_id=None, now=None) -> int:
    """T8 lazy sweep (A-005). Returned stock never triggers restock alerts (D-025)."""
    now = now or timezone.now()
    with transaction.atomic():
        overdue = Order.objects.filter(status=OrderStatus.PLACED, pickup_start_at__lte=now)
        if farmer_id is not None:
            overdue = overdue.filter(farmer_id=farmer_id)
        orders = list(overdue.select_related("customer").order_by("id").select_for_update(of=("self",)))
        if not orders:
            return 0

        returned = defaultdict(int)
        for product_id, quantity in OrderItem.objects.filter(order__in=orders).values_list("product_id", "quantity"):
            returned[product_id] += quantity
        products = list(Product.objects.filter(id__in=sorted(returned)).order_by("id").select_for_update(of=("self",)))
        for product in products:
            product.stock_quantity += returned[product.id]
            product.save(update_fields=["stock_quantity", "updated_at"])

        for order in orders:
            order.status = OrderStatus.EXPIRED
            order.version += 1
            order.save(update_fields=["status", "version", "updated_at"])
            record_status_change(
                order=order,
                from_status=OrderStatus.PLACED,
                to_status=OrderStatus.EXPIRED,
                transition=Transition.T8,
                actor=None,
                actor_role=ActorRole.SYSTEM,
                change_reason=ChangeReason.SYSTEM_EXPIRED,
            )
            notify(recipient=order.customer, event_type=NotificationType.ORDER_EXPIRED, context={"order": order})
    return len(orders)
