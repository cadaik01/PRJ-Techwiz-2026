"""
Module: notifications.views
Description: List the caller's notifications and mark them read.
"""

from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.utils import api_response
from notifications.models import Notification
from notifications.serializers import NotificationReadSerializer
from notifications.services import mark_all_notifications_read, mark_notification_read


class NotificationListView(ListAPIView):
    """Notifications belonging to the caller, newest first."""

    serializer_class = NotificationReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationReadView(GenericAPIView):
    """Mark one notification read. Another user's id is a 404, like a missing one."""

    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'id'

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def patch(self, request, id):
        notification = self.get_object()
        mark_notification_read(notification_id=notification.id)
        return api_response(message='Đã đánh dấu thông báo là đã đọc', request=request)


class NotificationReadAllView(APIView):
    """Mark every unread notification of the caller as read."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        count = mark_all_notifications_read(recipient_id=request.user.id)
        return api_response(message='Đã đánh dấu tất cả thông báo là đã đọc', request=request,
                            data={'updated': count})
