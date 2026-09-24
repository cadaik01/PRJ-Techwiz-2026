"""
Module: manager.common.order_closing
Description: Close every open order of a suspended farmer or a locked customer in one
             go (T3, T4, T12 / T5, T6, T13; A-002, Pass 4B §5.4).

Admin-triggered closes skip the time gates and If-Match, but still run under row
locks and bump `version` (A-002 §4). Kept here until the farmer module's FSM core
exists; merge into it then.
"""

from collections import Counter

from django.db.models import QuerySet

from catalog.models import Product
from marketlink_core.context import get_request_id
from orders.models import OPEN_STATUSES, ActorRole, Order, OrderItem, OrderStatusHistory


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
    # No RESTOCK alert here: only a farmer adding stock sends one (D-025).
    for product in Product.objects.filter(id__in=quantities).order_by('id').select_for_update(of=('self',)):
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
    return locked
