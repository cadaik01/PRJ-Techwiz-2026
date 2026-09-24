"""
Module: manager.customers.services
Description: Customer accounts for admins (FR-52, AD-09 -> AD-13, D-015, Pass 4B §5.4).
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q, QuerySet

from manager.common.notify import notify_user
from manager.common.order_closing import close_open_orders
from manager.common.retry import run_with_deadlock_retry
from marketlink_core.exceptions import BusinessValidationError
from marketlink_core.policies.roles import RoleCode
from notifications.models import NotificationType
from orders.models import OPEN_STATUSES, ChangeReason, Order, OrderStatus, Transition

User = get_user_model()

LOCK_TRANSITIONS = {
    OrderStatus.PLACED: Transition.T5,
    OrderStatus.ACCEPTED: Transition.T6,
    OrderStatus.READY_FOR_PICKUP: Transition.T13,
}


def admin_customers() -> QuerySet:
    return (
        User.objects.filter(role__code=RoleCode.CUSTOMER)
        .select_related('customer_profile')
        .annotate(
            total_orders=Count('orders', distinct=True),
            open_orders=Count('orders', filter=Q(orders__status__in=OPEN_STATUSES), distinct=True),
            no_show_count=Count('orders', filter=Q(orders__status=OrderStatus.NO_SHOW), distinct=True),
        )
        .order_by('-date_joined', '-id')
    )


def open_order_impact(orders: QuerySet[Order], *, party: str) -> dict:
    """{open_orders: {PLACED, ACCEPTED, READY_FOR_PICKUP, total}, affected_<party>s} for the confirm dialog."""
    open_orders = orders.filter(status__in=OPEN_STATUSES)
    by_status = dict(open_orders.values_list('status').annotate(n=Count('id')))
    counts = {status: by_status.get(status, 0) for status in OPEN_STATUSES}
    return {
        'open_orders': {**counts, 'total': sum(counts.values())},
        f'affected_{party}s': open_orders.values(f'{party}_id').distinct().count(),
    }


def deactivation_impact(*, customer_id: int) -> dict:
    return open_order_impact(Order.objects.filter(customer_id=customer_id), party='farmer')


def _notify_farmer(order: Order) -> None:
    profile = getattr(order.customer, 'customer_profile', None)
    customer_name = getattr(profile, 'full_name', '') or order.customer.email
    notify_user(
        recipient=order.farmer.user,
        type=NotificationType.ORDER_CANCELLED_CUSTOMER_LOCKED,
        title=f'Order #{order.id} was cancelled',
        message=f'Order #{order.id} from {customer_name} was cancelled because the customer account was locked. '
                'The stock has been returned; you can sell the items at your stall.',
        target_url=f'/farmer/orders/{order.id}',
        email_template='order_cancelled_customer_locked',
        email_context={
            'order_id': order.id, 'customer_name': customer_name, 'stall_name': order.farmer.stall_name,
            'pickup_date': order.pickup_date, 'market_name': order.market.name,
        },
    )


def deactivate_customer(*, customer_id: int, actor) -> int:
    """Lock the account and cancel its open orders (T5, T6, T13). Returns how many were cancelled.

    Lock order: users, then orders by id, then products by id (Pass 4A §5.2).
    """
    def operation():
        with transaction.atomic():
            customer = User.objects.select_for_update(of=('self',)).get(id=customer_id)
            if not customer.is_active:
                raise BusinessValidationError('The account is already locked', code='INVALID_STATUS_TRANSITION')
            customer.is_active = False
            customer.save(update_fields=['is_active', 'updated_at'])
            closed = close_open_orders(
                orders=Order.objects.filter(customer_id=customer_id), to_status=OrderStatus.CANCELLED,
                transitions=LOCK_TRANSITIONS, reason=ChangeReason.CUSTOMER_LOCKED_BY_ADMIN, actor=actor,
            )
            for order in closed:
                _notify_farmer(order)
            return len(closed)

    return run_with_deadlock_retry(operation)


def activate_customer(*, customer_id: int) -> None:
    with transaction.atomic():
        customer = User.objects.select_for_update(of=('self',)).get(id=customer_id)
        if customer.is_active:
            raise BusinessValidationError('The account is already active', code='INVALID_STATUS_TRANSITION')
        customer.is_active = True
        customer.save(update_fields=['is_active', 'updated_at'])
