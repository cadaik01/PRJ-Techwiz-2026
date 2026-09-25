from collections import Counter
from datetime import datetime, time, timedelta

from django.db.models import Count
from django.utils import timezone

from accounts.models import CustomerProfile, FarmerProfile, FarmerStatus
from accounts.selectors import list_pending_farmers
from marketlink_core.policies.roles import RoleCode
from markets.models import Market
from orders.models import Order, OrderStatus

DASHBOARD_DAYS = 30
PENDING_FARMER_LIMIT = 5


def _orders_per_day(*, days: int) -> list[dict]:
    last_day = timezone.localdate()
    first_day = last_day - timedelta(days=days - 1)
    # TruncDate and __date lookups compile to CONVERT_TZ, which returns NULL unless the MySQL
    # timezone tables are loaded, so the window is a datetime range and the buckets are counted
    # in Python.
    window_start = timezone.make_aware(datetime.combine(first_day, time.min))
    stamps = Order.objects.filter(created_at__gte=window_start).values_list("created_at", flat=True)
    counts = Counter(timezone.localtime(stamp).date() for stamp in stamps)
    days_range = [first_day + timedelta(days=offset) for offset in range(days)]
    return [{"date": day, "count": counts.get(day, 0)} for day in days_range]


def orders_by_status(*, queryset=None) -> list[dict]:
    # Every status is listed, zeros included, so the bar chart keeps a stable shape.
    source = Order.objects.all() if queryset is None else queryset
    counts = dict(
        source.values("status").annotate(total=Count("id")).values_list("status", "total")
    )
    return [{"status": status, "count": counts.get(status, 0)} for status in OrderStatus.values]


def dashboard_snapshot() -> dict:
    return {
        "totals": {
            "farmers": FarmerProfile.objects.count(),
            "farmers_pending": FarmerProfile.objects.filter(status=FarmerStatus.PENDING).count(),
            "customers": CustomerProfile.objects.filter(user__role__code=RoleCode.CUSTOMER).count(),
            "markets_active": Market.objects.filter(is_active=True).count(),
            "orders": Order.objects.count(),
        },
        "orders_by_day": _orders_per_day(days=DASHBOARD_DAYS),
        "orders_by_status": orders_by_status(),
        "pending_farmers": list_pending_farmers(limit=PENDING_FARMER_LIMIT),
    }
