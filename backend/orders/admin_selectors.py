from datetime import timedelta

from django.conf import settings
from django.db.models import Count
from django.utils import timezone

from orders.models import OPEN_STATUSES, Order, OrderStatus

# D-028: EXPIRED is never counted - the order lapsed because the farmer did not confirm it
# before the pickup time, which is not the customer's fault.
AT_RISK_STATUSES = (OrderStatus.NO_SHOW,)
DEFAULT_AT_RISK_THRESHOLD = 3
DEFAULT_AT_RISK_WINDOW_DAYS = 30


def at_risk_threshold() -> int:
    # The Farmer branch owns these settings; D-028 fixes the values until they land.
    return getattr(settings, "AT_RISK_THRESHOLD", DEFAULT_AT_RISK_THRESHOLD)


def at_risk_window_start():
    days = getattr(settings, "AT_RISK_WINDOW_DAYS", DEFAULT_AT_RISK_WINDOW_DAYS)
    return timezone.now() - timedelta(days=days)


def open_order_breakdown(queryset) -> dict:
    # Shape required by AD-04 and AD-11: one count per open status plus the total.
    rows = dict(
        queryset.filter(status__in=OPEN_STATUSES)
        .values("status")
        .annotate(total=Count("id"))
        .values_list("status", "total")
    )
    counts = {status: rows.get(status, 0) for status in OPEN_STATUSES}
    counts["total"] = sum(counts.values())
    return counts


def recent_order_ids(*, customer_id: int, limit: int) -> list[int]:
    # Materialised first: MySQL refuses a LIMIT inside IN (...) (error 1235).
    return list(
        Order.objects.filter(customer_id=customer_id)
        .order_by("-created_at", "-id")
        .values_list("id", flat=True)[:limit]
    )

