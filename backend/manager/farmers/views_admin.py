"""
Module: manager.farmers.views_admin
Description: Farmer management (FR-51, AD-02 -> AD-08, screens A-02, A-03).
"""

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from accounts.models import FarmerProfile, FarmerStatus
from accounts.permissions import IsAdmin
from core.exceptions import BusinessValidationError
from core.utils import api_response
from manager.common.audit import audited
from manager.common.serializers import ReasonWriteSerializer
from manager.farmers.serializers_admin import AdminFarmerRowSerializer, FarmerAdminDetailSerializer
from manager.farmers.services import (
    admin_farmers,
    approve_farmer,
    reinstate_farmer,
    reject_farmer,
    suspend_farmer,
    suspension_impact,
)
from manager.pagination import AdminPagination
from markets.models import FarmerMarket
from system.models import AuditAction


def _row(pk: int) -> dict:
    return AdminFarmerRowSerializer(admin_farmers().get(pk=pk)).data


def _statuses(raw: str) -> list[str]:
    statuses = [value.strip().upper() for value in raw.split(',') if value.strip()]
    if any(status not in FarmerStatus.values for status in statuses):
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors={'status': ['Trạng thái không hợp lệ']})
    return statuses


class FarmerAdminListView(APIView):
    """AD-02: paginated; `status` (tab, may be a comma list), `q` (stall name, email, phone), `market_id`."""

    permission_classes = [IsAdmin]

    def get(self, request):
        params = request.query_params
        queryset = admin_farmers()
        if statuses := _statuses(params.get('status', '')):
            queryset = queryset.filter(status__in=statuses)
        if q := params.get('q', '').strip():
            queryset = queryset.filter(Q(stall_name__icontains=q) | Q(user__email__icontains=q) | Q(phone__icontains=q))
        if (market_id := params.get('market_id', '').strip()).isdigit():
            queryset = queryset.filter(farmer_markets__market_id=int(market_id))
        paginator = AdminPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(AdminFarmerRowSerializer(page, many=True).data)


class FarmerAdminDetailView(APIView):
    """AD-03."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        farmer = get_object_or_404(
            FarmerProfile.objects.select_related('user').prefetch_related(Prefetch(
                'farmer_markets',
                queryset=FarmerMarket.objects.select_related('market').prefetch_related('pickup_slots')
                .order_by('market__name'),
            )),
            pk=pk,
        )
        data = FarmerAdminDetailSerializer(farmer, context={'request': request}).data
        return api_response(message='Lấy hồ sơ nông dân thành công', data=data, request=request)


class FarmerSuspensionImpactView(APIView):
    """AD-04: what AD-07 would decline, for the confirm dialog."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        get_object_or_404(FarmerProfile, pk=pk)
        return api_response(message='OK', data=suspension_impact(farmer_id=pk), request=request)


class FarmerStatusActionView(APIView):
    """AD-05 approve, AD-06 reject, AD-07 suspend, AD-08 reinstate. Each is audited."""

    permission_classes = [IsAdmin]
    ACTIONS = {
        'approve': (approve_farmer, AuditAction.FARMER_APPROVED, False, 'Đã duyệt nông dân'),
        'reject': (reject_farmer, AuditAction.FARMER_REJECTED, True, 'Đã từ chối hồ sơ nông dân'),
        'suspend': (suspend_farmer, AuditAction.FARMER_SUSPENDED, True, 'Đã đình chỉ nông dân'),
        'reinstate': (reinstate_farmer, AuditAction.FARMER_REINSTATED, False, 'Đã khôi phục nông dân'),
    }
    action = None

    def post(self, request, pk):
        get_object_or_404(FarmerProfile, pk=pk)
        service, audit_action, needs_reason, message = self.ACTIONS[self.action]
        kwargs, details = {'farmer_id': pk, 'actor': request.user}, {'farmer_id': pk}
        if needs_reason:
            serializer = ReasonWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            kwargs['reason'] = details['reason'] = serializer.validated_data['reason']
        affected = audited(
            request, action=audit_action, details=details, operation=lambda: service(**kwargs),
            result_details=lambda count: {'affected_orders': count} if self.action == 'suspend' else {},
        )
        data = _row(pk)
        if self.action == 'suspend':
            data['affected_orders'] = affected
            message = f'{message}, {affected} đơn đang mở đã bị từ chối'
        return api_response(message=message, data=data, request=request)
