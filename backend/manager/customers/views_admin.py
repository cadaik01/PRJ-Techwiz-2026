"""
Module: manager.customers.views_admin
Description: Customer management (FR-52, AD-09 -> AD-13, screen A-04).
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from manager.common.audit import audited
from manager.common.serializers import OrderSummarySerializer, ReasonWriteSerializer, order_summaries
from manager.customers.serializers_admin import CustomerAdminDetailSerializer, CustomerAdminRowSerializer
from manager.customers.services import (
    activate_customer,
    admin_customers,
    deactivate_customer,
    deactivation_impact,
)
from marketlink_core.pagination import ContractPagination
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response
from orders.models import Order
from system.models import AuditAction

BOOLEAN_PARAMS = {'true': True, 'false': False}
RECENT_ORDERS = 10


def _row(pk: int) -> dict:
    return CustomerAdminRowSerializer(admin_customers().get(pk=pk)).data


class CustomerAdminListView(APIView):
    """AD-09: paginated; `q` matches name, email or phone; `is_active=true|false`."""

    permission_classes = [IsAdmin]

    def get(self, request):
        queryset = admin_customers()
        if q := request.query_params.get('q', '').strip():
            queryset = queryset.filter(
                Q(email__icontains=q) | Q(customer_profile__full_name__icontains=q)
                | Q(customer_profile__phone__icontains=q),
            )
        if (is_active := BOOLEAN_PARAMS.get(request.query_params.get('is_active', ''))) is not None:
            queryset = queryset.filter(is_active=is_active)
        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(CustomerAdminRowSerializer(page, many=True).data)


class CustomerAdminDetailView(APIView):
    """AD-10."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        customer = get_object_or_404(admin_customers(), pk=pk)
        recent = order_summaries(Order.objects.filter(customer_id=pk)).order_by('-created_at', '-id')[:RECENT_ORDERS]
        data = CustomerAdminDetailSerializer(
            customer, context={'recent_orders': OrderSummarySerializer(recent, many=True).data},
        ).data
        return api_response(message='Customer retrieved', data=data, request=request)


class CustomerDeactivationImpactView(APIView):
    """AD-11: what AD-12 would cancel, for the confirm dialog."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        get_object_or_404(admin_customers(), pk=pk)
        return api_response(message='OK', data=deactivation_impact(customer_id=pk), request=request)


class CustomerDeactivateView(APIView):
    """AD-12 (Pass 4B §5.4)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        get_object_or_404(admin_customers(), pk=pk)
        serializer = ReasonWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason']
        affected = audited(
            request, action=AuditAction.CUSTOMER_DEACTIVATED, details={'customer_id': pk, 'reason': reason},
            operation=lambda: deactivate_customer(customer_id=pk, actor=request.user),
            result_details=lambda count: {'affected_orders': count},
        )
        return api_response(
            message=f'Account locked, {affected} open orders cancelled',
            data={**_row(pk), 'affected_orders': affected}, request=request,
        )


class CustomerActivateView(APIView):
    """AD-13."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        get_object_or_404(admin_customers(), pk=pk)
        audited(
            request, action=AuditAction.CUSTOMER_ACTIVATED, details={'customer_id': pk},
            operation=lambda: activate_customer(customer_id=pk),
        )
        return api_response(message='Account reactivated', data=_row(pk), request=request)
