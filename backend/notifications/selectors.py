from django.db.models import Q, QuerySet
from django.utils import timezone

from notifications.models import Announcement, AnnouncementAudience


def active_announcements(*, role_code: str | None = None) -> QuerySet[Announcement]:
    # §6.2: active, already started, not yet ended, and addressed to this audience.
    now = timezone.now()
    queryset = Announcement.objects.filter(
        is_active=True, starts_at__lte=now
    ).filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
    if role_code in (AnnouncementAudience.CUSTOMER, AnnouncementAudience.FARMER):
        queryset = queryset.filter(
            Q(audience=AnnouncementAudience.ALL) | Q(audience=role_code)
        )
    else:
        # A guest, or an admin, only sees the notices addressed to everyone.
        queryset = queryset.filter(audience=AnnouncementAudience.ALL)
    return queryset.order_by("-starts_at", "-id")
