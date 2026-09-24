"""
Module: manager.markets.views_admin
Description: Admin market management (FR-53, AD-14 -> AD-17, screens A-05, A-06).
"""

from django.db.models import Q
from django.db.models.functions import Collate
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from manager.markets.serializers_admin import MarketAdminReadSerializer, MarketAdminWriteSerializer
from manager.markets.services import admin_markets, create_market, set_market_active, update_market
from marketlink_core.pagination import ContractPagination
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response
from markets.models import Market

BOOLEAN_PARAMS = {'true': True, 'false': False}
ACCENT_INSENSITIVE = 'utf8mb4_0900_ai_ci'


def _market_data(request, market_id: int) -> dict:
    return MarketAdminReadSerializer(admin_markets().get(id=market_id), context={'request': request}).data


class MarketAdminListView(APIView):
    """AD-14 (paginated, `q`, `is_active`) and AD-15."""

    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        queryset = admin_markets()
        if q := request.query_params.get('q', '').strip():
            # name is stored accent-sensitive (as_ci) for uniqueness; search it accent-insensitive.
            queryset = queryset.annotate(name_search=Collate('name', ACCENT_INSENSITIVE)).filter(
                Q(name_search__icontains=q) | Q(address__icontains=q),
            )
        if (is_active := BOOLEAN_PARAMS.get(request.query_params.get('is_active', ''))) is not None:
            queryset = queryset.filter(is_active=is_active)
        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = MarketAdminReadSerializer(page, many=True, context={'request': request}).data
        return paginator.get_paginated_response(data)

    def post(self, request):
        serializer = MarketAdminWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        market = create_market(**serializer.validated_data)
        return api_response(
            message='Đã thêm chợ', data=_market_data(request, market.id),
            status_code=status.HTTP_201_CREATED, request=request,
        )


class MarketAdminDetailView(APIView):
    """AD-16."""

    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ['get', 'patch', 'options']

    def get(self, request, pk):
        market = get_object_or_404(admin_markets(), pk=pk)
        data = MarketAdminReadSerializer(market, context={'request': request}).data
        return api_response(message='Lấy thông tin chợ thành công', data=data, request=request)

    def patch(self, request, pk):
        market = get_object_or_404(Market, pk=pk)
        serializer = MarketAdminWriteSerializer(market, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_market(market_id=pk, **serializer.validated_data)
        return api_response(message='Đã cập nhật chợ', data=_market_data(request, pk), request=request)


class MarketAdminActivationView(APIView):
    """AD-17: POST …/activate/ and …/deactivate/ (soft remove, D-017)."""

    permission_classes = [IsAdmin]
    is_active = True

    def post(self, request, pk):
        get_object_or_404(Market, pk=pk)
        set_market_active(market_id=pk, is_active=self.is_active)
        message = 'Đã kích hoạt chợ' if self.is_active else 'Đã ngừng hoạt động chợ'
        return api_response(message=message, data=_market_data(request, pk), request=request)
