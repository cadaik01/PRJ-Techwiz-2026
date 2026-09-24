from django.utils import timezone

from notifications.models import Notification, NotificationType

# Minimal single entry point (A-006). It only writes the in-app row inside the caller's transaction;
# module P4 adds the WebSocket push and email on transaction.on_commit here without changing callers.


def _pickup_label(order) -> str:
    start = timezone.localtime(order.pickup_start_at)
    end = timezone.localtime(order.pickup_end_at)
    return f"{start:%d/%m/%Y} {start:%H:%M}-{end:%H:%M}"


_BUILDERS = {
    NotificationType.ORDER_PLACED: lambda order: (
        f"New order #{order.pk}",
        f"A customer placed order #{order.pk} for pickup on {_pickup_label(order)}",
        f"/farmer/orders/{order.pk}",
    ),
    NotificationType.ORDER_EXPIRED: lambda order: (
        f"Order #{order.pk} expired",
        f"Order #{order.pk} was not confirmed before the pickup time and has expired",
        f"/customer/orders/{order.pk}",
    ),
}


def notify(*, recipient, event_type: str, context: dict) -> Notification:
    title, message, target_url = _BUILDERS[event_type](context["order"])
    return Notification.objects.create(
        recipient=recipient, type=event_type, title=title[:150], message=message[:500], target_url=target_url
    )
