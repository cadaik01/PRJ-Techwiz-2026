from django.utils import timezone

from marketlink_core.exceptions import BusinessValidationError, ErrorCode
from orders.models import ActorRole, Order, OrderStatus
from orders.services.fsm import transition_order


def expire_overdue_orders(*, farmer_id: int | None = None) -> int:
    overdue = Order.objects.filter(status=OrderStatus.PLACED, pickup_start_at__lte=timezone.now())
    if farmer_id is not None:
        overdue = overdue.filter(farmer_id=farmer_id)

    expired = 0
    for order_id in list(overdue.order_by("id").values_list("id", flat=True)):
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
    return expired
