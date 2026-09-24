"""
Module: notifications.public.views_public
Description: PU-13, announcements shown in the N-04 banner.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from marketlink_core.policies.roles import RoleCode
from marketlink_core.responses import api_response
from notifications.models import Announcement, AnnouncementAudience
from notifications.public.serializers_public import AnnouncementReadSerializer

# A signed-in customer or farmer also sees the announcements aimed at their role.
ROLE_AUDIENCE = {RoleCode.CUSTOMER: AnnouncementAudience.CUSTOMER, RoleCode.FARMER: AnnouncementAudience.FARMER}


class AnnouncementPublicListView(APIView):
    """Live announcements (Pass 4B §6.2): active, started, not ended, right audience. Not paginated."""

    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        audiences = [AnnouncementAudience.ALL]
        user = request.user
        if user.is_authenticated and user.role.code in ROLE_AUDIENCE:
            audiences.append(ROLE_AUDIENCE[user.role.code])
        queryset = Announcement.objects.filter(
            Q(ends_at__isnull=True) | Q(ends_at__gt=now),
            is_active=True, starts_at__lte=now, audience__in=audiences,
        ).order_by('-starts_at', '-id')
        data = AnnouncementReadSerializer(queryset, many=True).data
        return api_response(message='Announcements retrieved', data=data, request=request)
