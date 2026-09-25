from typing import Any

from django.utils import timezone

from orders.models import Order


def format_pickup_label(order: Order) -> str:
    start = timezone.localtime(order.pickup_start_at)
    end = timezone.localtime(order.pickup_end_at)
    return f"{start:%a %d/%m}, {start:%H:%M}–{end:%H:%M}"


def build_order_context(order: Order) -> dict[str, Any]:
    customer_profile = getattr(order.customer, "customer_profile", None)
    return {
        "order_id": order.pk,
        "farmer_name": order.farmer.stall_name,
        "customer_name": customer_profile.full_name if customer_profile else order.customer.email,
        "market_name": order.market.name,
        "stall_label": order.stall_label or order.farmer.stall_name,
        "pickup_label": format_pickup_label(order),
    }
