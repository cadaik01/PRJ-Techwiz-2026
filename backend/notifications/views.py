"""
Module: notifications.views
Description: List the caller's notifications and mark them read.
"""

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import api_response

from .models import Notification
from .serializers import NotificationReadSerializer


class NotificationListView(ListAPIView):
    """Notifications belonging to the caller, newest first."""

    serializer_class = NotificationReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Scoping here rather than in the view body is what keeps an id from
        # another account out of reach.
        return Notification.objects.filter(recipient=self.request.user)

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        paginated = self.get_paginated_response(serializer.data)
        return api_response(message='Notifications retrieved.', data=paginated.data)


class NotificationReadView(APIView):
    """Mark one notification read."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        updated = Notification.objects.filter(
            pk=notification_id, recipient=request.user
        ).update(is_read=True)

        if not updated:
            return api_response(
                success=False,
                message='Notification not found.',
                errors={'detail': ['Notification not found.']},
                status=status.HTTP_404_NOT_FOUND,
            )
        return api_response(message='Notification marked as read.')


class NotificationReadAllView(APIView):
    """Mark every unread notification of the caller as read."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return api_response(message='Notifications marked as read.', data={'updated': count})
