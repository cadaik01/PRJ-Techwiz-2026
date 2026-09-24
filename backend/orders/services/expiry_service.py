from collections import defaultdict

from django.db import transaction
from django.utils import timezone

from notifications.models import NotificationType
from notifications.services import notify
from orders.models import ActorRole, ChangeReason, Order, OrderItem, OrderStatus, Transition
from orders.services.history_service import record_status_change
from orders.services.locking import lock_products

# T8 lazy sweep (A-005). Returned stock never triggers restock alerts (D-025).
# The steps are exposed separately so checkout can fold them into its own single, id-ordered locks.


def lock_overdue_orders(*, now, farmer_ids=None) -> list[Order]:
    candidates = Order.objects.filter(status=OrderStatus.PLACED, pickup_start_at__lte=now)
    if farmer_ids is not None:
        candidates = candidates.filter(farmer_id__in=farmer_ids)
    ids = list(candidates.values_list("id", flat=True))
    if not ids:
        return []
    # InnoDB locks rows in the order the chosen index is scanned, not in ORDER BY order. Locking through the
    # primary key keeps every caller (checkout, dashboard sweep, expire_orders) in ascending-id order.
    return list(
        Order.objects.filter(pk__in=ids, status=OrderStatus.PLACED)
        .select_related("customer")
        .order_by("id")
        .select_for_update(of=("self",))
    )


def returned_stock(orders) -> dict[int, int]:
    returned = defaultdict(int)
    for product_id, quantity in OrderItem.objects.filter(order__in=orders).values_list("product_id", "quantity"):
        returned[product_id] += quantity
    return dict(returned)


def finish_expiry(*, orders, products, returned) -> None:
    """Caller holds the locks on `orders` and on every product in `returned`."""
    for product_id, quantity in returned.items():
        product = products[product_id]
        product.stock_quantity += quantity
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


def expire_overdue_orders(*, farmer_id=None, now=None) -> int:
    now = now or timezone.now()
    with transaction.atomic():
        orders = lock_overdue_orders(now=now, farmer_ids=None if farmer_id is None else [farmer_id])
        if not orders:
            return 0
        returned = returned_stock(orders)
        finish_expiry(orders=orders, products=lock_products(returned), returned=returned)
    return len(orders)
