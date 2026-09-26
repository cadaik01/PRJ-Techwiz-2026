from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from marketlink_core.permissions import IsAdmin
from marketlink_core.responses import api_response
from notifications.admin_portal.serializers_admin import (
    AnnouncementAdminReadSerializer,
    AnnouncementAdminWriteSerializer,
)
from notifications.models import Announcement


def _announcements():
    return Announcement.objects.select_related("created_by")


class AnnouncementListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return _announcements()

    def get_serializer_class(self):
        return (
            AnnouncementAdminWriteSerializer
            if self.request.method == "POST"
            else AnnouncementAdminReadSerializer
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=request.user)
        return api_response(
            message="Announcement created.",
            request=request,
            data=AnnouncementAdminReadSerializer(announcement).data,
            status_code=201,
        )


class AnnouncementDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    lookup_url_kwarg = "id"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return _announcements()

    def get_serializer_class(self):
        return (
            AnnouncementAdminWriteSerializer
            if self.request.method == "PATCH"
            else AnnouncementAdminReadSerializer
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return api_response(message="OK", request=request, data=serializer.data)

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()
        return api_response(
            message="Announcement updated.",
            request=request,
            data=AnnouncementAdminReadSerializer(announcement).data,
        )

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        # 204 carries no body (Pass 4B §2.1).
        return Response(status=status.HTTP_204_NO_CONTENT)
