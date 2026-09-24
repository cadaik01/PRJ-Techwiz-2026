"""
Module: manager.announcements.views_admin
Description: Site-wide announcements (FR-57, AD-27, AD-28, screen A-10, D-010).
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from manager.announcements.serializers_admin import (
    AnnouncementAdminReadSerializer,
    AnnouncementAdminWriteSerializer,
)
from marketlink_core.pagination import ContractPagination
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response
from notifications.models import Announcement


def _announcements():
    return Announcement.objects.select_related('created_by').order_by('-starts_at', '-id')


class AnnouncementAdminListView(APIView):
    """AD-27: paginated list of every announcement, and create."""

    permission_classes = [IsAdmin]

    def get(self, request):
        paginator = ContractPagination()
        page = paginator.paginate_queryset(_announcements(), request, view=self)
        return paginator.get_paginated_response(AnnouncementAdminReadSerializer(page, many=True).data)

    def post(self, request):
        serializer = AnnouncementAdminWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=request.user)
        return api_response(
            message='Đã đăng thông báo', data=AnnouncementAdminReadSerializer(announcement).data,
            status_code=status.HTTP_201_CREATED, request=request,
        )


class AnnouncementAdminDetailView(APIView):
    """AD-28: partial update and hard delete (announcements are not referenced elsewhere)."""

    permission_classes = [IsAdmin]
    http_method_names = ['patch', 'delete', 'options']

    def patch(self, request, pk):
        announcement = get_object_or_404(_announcements(), pk=pk)
        serializer = AnnouncementAdminWriteSerializer(announcement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_response(
            message='Đã cập nhật thông báo', data=AnnouncementAdminReadSerializer(announcement).data,
            request=request,
        )

    def delete(self, request, pk):
        get_object_or_404(Announcement, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
