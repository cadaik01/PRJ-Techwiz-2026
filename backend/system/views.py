"""
Module: system.views
Description: Security log browsing for the Super Admin. Read-only: audit_logs is
             append-only, so no update or delete endpoint exists.
"""

from rest_framework.generics import ListAPIView

from accounts.permissions import IsAdmin
from system.models import AuditLog
from system.serializers import AuditLogReadSerializer


class AuditLogAdminListView(ListAPIView):
    serializer_class = AuditLogReadSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related('user')
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action.upper())
        return queryset
