"""
Module: manager.markets.views_admin
Description: Admin market management (FR-53, AD-14 -> AD-17, screens A-05, A-06).
"""

from django.db.models import Q
from django.db.models.functions import Collate
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from manager.markets.serializers_admin import (
    MarketAdminReadSerializer,
    MarketAdminWriteSerializer,
    MarketClosureWriteSerializer,
)
from manager.markets.services import (
    admin_markets,
    create_market,
    create_market_closure,
    market_closures,
    set_market_active,
    update_market,
)
from marketlink_core.pagination import StandardPagination
from marketlink_core.permissions import IsAdmin
from marketlink_core.responses import api_response
from markets.models import Market, MarketClosure
from markets.public.closures import ClosureSerializer

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
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = MarketAdminReadSerializer(page, many=True, context={'request': request}).data
        return paginator.get_paginated_response(data)

    def post(self, request):
        serializer = MarketAdminWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        market = create_market(**serializer.validated_data)
        return api_response(
            message='Market created', data=_market_data(request, market.id),
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
        return api_response(message='Market retrieved', data=data, request=request)

    def patch(self, request, pk):
        market = get_object_or_404(Market, pk=pk)
        serializer = MarketAdminWriteSerializer(market, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        _, switched_off = update_market(market_id=pk, **serializer.validated_data)
        return api_response(
            message=f'Market updated, {switched_off} pickup slots outside the new schedule were switched off'
            if switched_off else 'Market updated',
            data={**_market_data(request, pk), 'deactivated_slot_count': switched_off}, request=request,
        )


class MarketAdminActivationView(APIView):
    """AD-17: POST …/activate/ and …/deactivate/ (soft remove, D-017; refused with open orders, D-022)."""

    permission_classes = [IsAdmin]
    is_active = True

    def post(self, request, pk):
        get_object_or_404(Market, pk=pk)
        set_market_active(market_id=pk, is_active=self.is_active)
        message = 'Market activated' if self.is_active else 'Market deactivated'
        return api_response(message=message, data=_market_data(request, pk), request=request)


class MarketClosureListView(APIView):
    """AD-31 (`include_past=true` adds finished closures) and AD-32."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        get_object_or_404(Market, pk=pk)
        include_past = request.query_params.get('include_past', '').lower() == 'true'
        data = ClosureSerializer(market_closures(market_id=pk, include_past=include_past), many=True).data
        return api_response(message='Closures retrieved', data=data, request=request)

    def post(self, request, pk):
        get_object_or_404(Market, pk=pk)
        serializer = MarketClosureWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        closure = create_market_closure(market_id=pk, **serializer.validated_data)
        return api_response(
            message='Closure added', data=ClosureSerializer(closure).data,
            status_code=status.HTTP_201_CREATED, request=request,
        )


class MarketClosureDetailView(APIView):
    """AD-33: removing a closure reopens those days (the market opens early)."""

    permission_classes = [IsAdmin]
    http_method_names = ['delete', 'options']

    def delete(self, request, pk):
        get_object_or_404(MarketClosure, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
