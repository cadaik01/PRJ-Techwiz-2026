"""
Module: manager.audit_logs.views_admin
Description: Security log browsing (FR-58, AD-29, AD-30, screen A-11). audit_logs is
             append-only, so there is no write endpoint.
"""

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from core.exceptions import BusinessValidationError
from core.utils import api_response
from manager.audit_logs.serializers_admin import AuditLogReadSerializer
from manager.common.dates import day_range
from manager.pagination import AdminPagination
from system.models import AuditLog


def _filtered_logs(params):
    queryset = AuditLog.objects.select_related('user').order_by('-created_at', '-id')
    if actions := [a.strip().upper() for a in params.get('action', '').split(',') if a.strip()]:
        queryset = queryset.filter(action__in=actions)
    if user_id := params.get('user_id', '').strip():
        if not user_id.isdigit():
            raise BusinessValidationError('Dữ liệu không hợp lệ', errors={'user_id': ['Mã người dùng không hợp lệ']})
        queryset = queryset.filter(user_id=int(user_id))
    start, end = day_range(params)
    if start:
        queryset = queryset.filter(created_at__gte=start)
    if end:
        queryset = queryset.filter(created_at__lt=end)
    return queryset


class AuditLogAdminListView(APIView):
    """AD-29: `action` (one or comma-separated), `user_id`, `from`, `to` (YYYY-MM-DD, Vietnam time)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        paginator = AdminPagination()
        page = paginator.paginate_queryset(_filtered_logs(request.query_params), request, view=self)
        return paginator.get_paginated_response(AuditLogReadSerializer(page, many=True).data)


class AuditLogAdminDetailView(APIView):
    """AD-30."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        log = get_object_or_404(AuditLog.objects.select_related('user'), pk=pk)
        return api_response(
            message='Lấy nhật ký thành công', data=AuditLogReadSerializer(log).data, request=request,
        )
