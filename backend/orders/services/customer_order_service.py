from marketlink_core.exceptions import ResourceNotFoundError
from orders.models import ActorRole, Order, OrderStatus
from orders.services.fsm import transition_order


def cancel_customer_order(*, customer, order_id: int, expected_version: int, reason: str | None = None) -> Order:
    """CU-08: T5 (PLACED) or T6 (ACCEPTED) through the Farmer branch's FSM, which checks cutoff and stock."""
    # Someone else's order is "not found" (Pass 4B §6), before the FSM could answer 403.
    if not Order.objects.filter(pk=order_id, customer=customer).exists():
        raise ResourceNotFoundError()
    return transition_order(
        order_id=order_id,
        to_status=OrderStatus.CANCELLED,
        actor=customer,
        actor_role=ActorRole.CUSTOMER,
        expected_version=expected_version,
        reason=reason,
    )
