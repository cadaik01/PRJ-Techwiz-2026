from django.db import transaction
from django.utils import timezone

from marketlink_core.context import get_request_id
from marketlink_core.exceptions import BusinessValidationError, ErrorCode
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import ActorRole, Order, OrderStatus, OrderStatusHistory
from orders.services.fsm import transition_order
from orders.services.notification_context import build_order_context


def expire_overdue_orders(*, farmer_id: int | None = None) -> int:
    now = timezone.now()

    # 1. Expire PLACED orders whose pickup has started (A-005, D-029)
    overdue_placed = Order.objects.filter(status=OrderStatus.PLACED, pickup_start_at__lte=now)
    if farmer_id is not None:
        overdue_placed = overdue_placed.filter(farmer_id=farmer_id)

    expired = 0
    for order_id in list(overdue_placed.order_by("id").values_list("id", flat=True)):
        try:
            transition_order(
                order_id=order_id,
                to_status=OrderStatus.EXPIRED,
                actor=None,
                actor_role=ActorRole.SYSTEM,
            )
        except BusinessValidationError as exc:
            # Someone else moved the order (e.g. the farmer accepted it) between the scan and the lock.
            if exc.code != ErrorCode.INVALID_STATUS_TRANSITION:
                raise
            continue
        expired += 1

    # 2. Expire pending change requests for ACCEPTED orders whose pickup has started (D-030, CT-21)
    overdue_changes = Order.objects.filter(
        status=OrderStatus.ACCEPTED,
        pickup_start_at__lte=now,
        pending_change__isnull=False,
    )
    if farmer_id is not None:
        overdue_changes = overdue_changes.filter(farmer_id=farmer_id)

    for order_id in list(overdue_changes.order_by("id").values_list("id", flat=True)):
        with transaction.atomic():
            order = Order.objects.select_for_update().filter(id=order_id).first()
            if not order or not order.pending_change or order.pickup_start_at > timezone.now():
                continue
            order.pending_change = None
            order.version += 1
            order.save(update_fields=["pending_change", "version", "updated_at"])

            OrderStatusHistory.objects.create(
                order=order,
                from_status=OrderStatus.ACCEPTED,
                to_status=OrderStatus.ACCEPTED,
                transition=None,
                actor=None,
                actor_role=ActorRole.SYSTEM,
                change_reason="Change request expired",
                request_id=get_request_id(),
            )
            notify(
                recipient=order.customer,
                event_type=NotificationType.ORDER_CHANGE_REJECTED,
                context={
                    **build_order_context(order),
                    "reason": "The farmer did not respond before the pickup time.",
                },
            )

    return expired

