from marketlink_core.context import get_request_id
from orders.models import OrderStatusHistory


def record_status_change(*, order, from_status, to_status, transition, actor, actor_role, change_reason=None) -> OrderStatusHistory:
    """Must run inside the same transaction.atomic() that updates the order (Pass 4A §3.4)."""
    return OrderStatusHistory.objects.create(
        order=order,
        from_status=from_status,
        to_status=to_status,
        transition=transition,
        actor=actor,
        actor_role=actor_role,
        change_reason=change_reason,
        request_id=get_request_id(),
    )
