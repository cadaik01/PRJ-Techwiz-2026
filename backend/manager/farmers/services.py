"""
Module: manager.farmers.services
Description: Farmer approval lifecycle for admins (FR-51, AD-02 -> AD-08, D-015,
             Pass 4B §5.4): PENDING -> APPROVED | REJECTED, APPROVED <-> SUSPENDED.
"""

from django.db import transaction
from django.db.models import Count, Q, QuerySet

from accounts.models import FarmerProfile, FarmerStatus
from manager.common.notify import notify_user
from manager.common.order_closing import close_open_orders
from manager.customers.services import open_order_impact
from marketlink_core.exceptions import BusinessValidationError
from marketlink_core.services.db_retry import run_with_deadlock_retry
from notifications.models import NotificationType
from orders.models import OPEN_STATUSES, ChangeReason, Order, OrderStatus, Transition

SUSPEND_TRANSITIONS = {
    OrderStatus.PLACED: Transition.T3,
    OrderStatus.ACCEPTED: Transition.T4,
    OrderStatus.READY_FOR_PICKUP: Transition.T12,
}
# What customers read: the admin's internal reason stays in the audit log.
SUSPENDED_REASON_FOR_CUSTOMERS = 'The stall is temporarily not operating on MarketLink'

# (from, to) -> in-app title and message for the farmer.
STATUS_NOTICES = {
    (FarmerStatus.PENDING, FarmerStatus.APPROVED): (
        'Your account has been approved', 'You can now list products and receive orders.'),
    (FarmerStatus.PENDING, FarmerStatus.REJECTED): ('Your application was rejected', 'Reason: {reason}'),
    (FarmerStatus.APPROVED, FarmerStatus.SUSPENDED): (
        'Your account has been suspended', 'Reason: {reason}. Your open orders were declined and restocked.'),
    (FarmerStatus.SUSPENDED, FarmerStatus.APPROVED): (
        'Your account has been reinstated', 'You can continue selling.'),
}


def admin_farmers() -> QuerySet[FarmerProfile]:
    return (
        FarmerProfile.objects.select_related('user')
        .annotate(
            product_count=Count('products', filter=Q(products__is_archived=False), distinct=True),
            open_order_count=Count('orders', filter=Q(orders__status__in=OPEN_STATUSES), distinct=True),
        )
        .order_by('-user__date_joined', '-user_id')
    )


def suspension_impact(*, farmer_id: int) -> dict:
    return open_order_impact(Order.objects.filter(farmer_id=farmer_id), party='customer')


def _notify_customer_declined(order: Order) -> None:
    profile = getattr(order.customer, 'customer_profile', None)
    notify_user(
        recipient=order.customer,
        type=NotificationType.ORDER_DECLINED,
        title=f'Order #{order.id} was declined',
        message=f'{order.farmer.stall_name} is temporarily not operating, so order #{order.id} was cancelled. '
                'You do not need to go to the market for it.',
        target_url=f'/customer/orders/{order.id}',
        email_template='order_declined',
        email_context={
            'order_id': order.id, 'customer_name': getattr(profile, 'full_name', '') or order.customer.email,
            'stall_name': order.farmer.stall_name, 'pickup_date': order.pickup_date,
            'market_name': order.market.name, 'reason': SUSPENDED_REASON_FOR_CUSTOMERS,
        },
    )


def _notify_farmer_status(farmer: FarmerProfile, from_status: str, reason: str | None) -> None:
    title, message = STATUS_NOTICES[(from_status, farmer.status)]
    notify_user(
        recipient=farmer.user, type=NotificationType.ACCOUNT_STATUS_CHANGED,
        title=title, message=message.format(reason=reason), target_url='/farmer',
    )


def _change_status(*, farmer_id: int, actor, allowed_from: str, to_status: str, reason: str | None,
                   close_orders: bool = False) -> int:
    """Move one farmer along the D-015 lifecycle; return how many open orders were declined."""
    def operation():
        with transaction.atomic():
            farmer = FarmerProfile.objects.select_related('user').select_for_update(of=('self',)).get(
                user_id=farmer_id,
            )
            if farmer.status != allowed_from:
                raise BusinessValidationError(
                    'The farmer\'s current status does not allow this action',
                    code='INVALID_STATUS_TRANSITION',
                )
            farmer.status = to_status
            farmer.status_reason = reason
            farmer._history_user = actor
            farmer._change_reason = reason
            farmer.save()

            closed = []
            if close_orders:
                # After the status change, so restock alerts see the farmer as no longer public.
                closed = close_open_orders(
                    orders=Order.objects.filter(farmer_id=farmer_id), to_status=OrderStatus.DECLINED,
                    transitions=SUSPEND_TRANSITIONS, reason=ChangeReason.FARMER_SUSPENDED_BY_ADMIN, actor=actor,
                )
                for order in closed:
                    _notify_customer_declined(order)
            _notify_farmer_status(farmer, allowed_from, reason)
            return len(closed)

    return run_with_deadlock_retry(operation)


def approve_farmer(*, farmer_id: int, actor) -> None:
    _change_status(farmer_id=farmer_id, actor=actor, allowed_from=FarmerStatus.PENDING,
                   to_status=FarmerStatus.APPROVED, reason=None)


def reject_farmer(*, farmer_id: int, actor, reason: str) -> None:
    _change_status(farmer_id=farmer_id, actor=actor, allowed_from=FarmerStatus.PENDING,
                   to_status=FarmerStatus.REJECTED, reason=reason)


def suspend_farmer(*, farmer_id: int, actor, reason: str) -> int:
    """T3, T4, T12 for every open order; lock order farmer_profiles -> orders -> products."""
    return _change_status(farmer_id=farmer_id, actor=actor, allowed_from=FarmerStatus.APPROVED,
                          to_status=FarmerStatus.SUSPENDED, reason=reason, close_orders=True)


def reinstate_farmer(*, farmer_id: int, actor) -> None:
    _change_status(farmer_id=farmer_id, actor=actor, allowed_from=FarmerStatus.SUSPENDED,
                   to_status=FarmerStatus.APPROVED, reason=None)
