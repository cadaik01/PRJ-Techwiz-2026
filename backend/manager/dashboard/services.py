"""
Module: manager.dashboard.services
Description: Admin dashboard figures (FR-50, AD-01, screen A-01).
"""

from collections import Counter
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from accounts.models import FarmerProfile, FarmerStatus
from core.policies.roles import RoleCode
from markets.models import Market
from orders.models import Order, OrderStatus

User = get_user_model()
CHART_DAYS = 30


def orders_by_status(orders: QuerySet[Order]) -> list[dict]:
    """Every status, zero-filled, in FSM order."""
    counts = dict(orders.order_by().values_list('status').annotate(n=Count('id')))
    return [{'status': status, 'count': counts.get(status, 0)} for status in OrderStatus.values]


def orders_by_day(*, days: int = CHART_DAYS) -> list[dict]:
    """Orders created per Vietnamese calendar day over the last `days` days, today included.

    Bucketed in Python instead of TruncDate, which needs MySQL's time zone tables.
    """
    first_day = timezone.localdate() - timedelta(days=days - 1)
    since = timezone.make_aware(datetime.combine(first_day, time.min))
    per_day = Counter(
        timezone.localtime(created_at).date()
        for created_at in Order.objects.filter(created_at__gte=since).values_list('created_at', flat=True)
    )
    return [
        {'date': day.isoformat(), 'count': per_day.get(day, 0)}
        for day in (first_day + timedelta(days=offset) for offset in range(days))
    ]


def dashboard_totals() -> dict:
    farmers = FarmerProfile.objects.aggregate(
        farmers=Count('pk'), farmers_pending=Count('pk', filter=Q(status=FarmerStatus.PENDING)),
    )
    return {
        **farmers,
        'customers': User.objects.filter(role__code=RoleCode.CUSTOMER).count(),
        'markets_active': Market.objects.filter(is_active=True).count(),
        'orders': Order.objects.count(),
    }
