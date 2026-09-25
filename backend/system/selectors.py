from datetime import datetime, time, timedelta

from django.db.models import QuerySet
from django.utils import timezone
from django.utils.dateparse import parse_date

from system.models import AuditLog


def _local_day_start(raw_date: str | None) -> datetime | None:
    day = parse_date(raw_date) if raw_date else None
    if day is None:
        return None
    return timezone.make_aware(datetime.combine(day, time.min))


def list_audit_logs(
    *,
    action: str | None = None,
    user_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> QuerySet[AuditLog]:
    queryset = AuditLog.objects.select_related("user")

    if action:
        queryset = queryset.filter(action=action.upper())
    if user_id and str(user_id).isdigit():
        queryset = queryset.filter(user_id=int(user_id))

    start = _local_day_start(date_from)
    if start is not None:
        queryset = queryset.filter(created_at__gte=start)

    end = _local_day_start(date_to)
    if end is not None:
        # `to` is inclusive, so take every row before the following midnight.
        queryset = queryset.filter(created_at__lt=end + timedelta(days=1))

    return queryset
