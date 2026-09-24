"""
Module: manager.common.order_closing
Description: Close every open order of a suspended farmer or a locked customer in one
             go (T3, T4, T12 / T5, T6, T13; A-002, Pass 4B §5.4).

Admin-triggered closes skip the time gates and If-Match, but still run under row
locks and bump `version` (A-002 §4). Kept here until the farmer module's FSM core
exists; merge into it then.
"""

from collections import Counter

from django.db.models import Q, QuerySet

from accounts.models import FarmerStatus
from catalog.models import Product
from favorites.models import FavoriteProduct
from marketlink_core.context import get_request_id
from notifications.models import NotificationType
from notifications.services import push_notification
from orders.models import OPEN_STATUSES, ActorRole, Order, OrderItem, OrderStatusHistory

# Visible to the public (Pass 4B §6.2): only then is a restock worth announcing.
PUBLIC_PRODUCT = Q(
    is_archived=False, is_hidden_by_admin=False, is_available=True,
    farmer__status=FarmerStatus.APPROVED, farmer__user__is_active=True,
)


def _restock_alerts(product_ids: list[int]) -> None:
    """RESTOCK in-app to customers who favorited a product that went from 0 to > 0 (§5.5)."""
    for product in Product.objects.filter(PUBLIC_PRODUCT, id__in=product_ids):
        for customer_id in FavoriteProduct.objects.filter(product=product).values_list('customer_id', flat=True):
            push_notification(
                user_id=customer_id, type=NotificationType.RESTOCK,
                title='A favorite product is back in stock',
                message=f'{product.name} is back in stock',
                target_url=f'/products/{product.id}',
            )


def close_open_orders(
    *,
    orders: QuerySet[Order],
    to_status: str,
    transitions: dict[str, str],
    reason: str,
    actor,
) -> list[Order]:
    """Lock, close and restock the open orders in `orders`; return them, closed.

    Call inside transaction.atomic(), after locking the parent row (farmer profile or
    user). Lock order: orders by id, then products by id (Pass 4A §5.2).
    """
    locked = list(
        orders.filter(status__in=OPEN_STATUSES)
        .select_related('customer__customer_profile', 'farmer__user', 'market')
        .order_by('id')
        .select_for_update(of=('self',))
    )
    if not locked:
        return []

    quantities = Counter()
    for product_id, quantity in OrderItem.objects.filter(order__in=locked).values_list('product_id', 'quantity'):
        quantities[product_id] += quantity
    back_in_stock = []
    for product in Product.objects.filter(id__in=quantities).order_by('id').select_for_update(of=('self',)):
        if product.stock_quantity == 0:
            back_in_stock.append(product.id)
        product.stock_quantity += quantities[product.id]
        product.save(update_fields=['stock_quantity', 'updated_at'])

    request_id = get_request_id()
    history = []
    for order in locked:
        history.append(OrderStatusHistory(
            order=order, from_status=order.status, to_status=to_status, transition=transitions[order.status],
            actor=actor, actor_role=ActorRole.ADMIN, change_reason=reason, request_id=request_id,
        ))
        order.closed_from = order.status          # read by callers to word the notification
        order.status = to_status
        order.version += 1
        order.save(update_fields=['status', 'version', 'updated_at'])
    OrderStatusHistory.objects.bulk_create(history)

    _restock_alerts(back_in_stock)
    return locked
