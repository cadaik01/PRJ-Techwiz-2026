"""
Module: markets.public.views_public
Description: Public market pages (FR-10, FR-11, FR-13, PU-03 -> PU-05, screens G-02, G-03).
"""

from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from django.db.models.functions import Collate
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from accounts.models import FarmerStatus
from accounts.public.farmers import is_customer, public_farmers
from accounts.public.serializers_public import FarmerSummarySerializer
from favorites.models import FavoriteMarket
from marketlink_core.exceptions import BusinessValidationError
from marketlink_core.pagination import ContractPagination
from marketlink_core.utils import api_response
from markets.models import Market, MarketOperatingDay
from markets.public.geo import distance_km, read_point
from markets.public.serializers_public import MarketDetailSerializer, MarketSummarySerializer

SELLING_FARMER = Q(
    farmer_markets__farmer__status=FarmerStatus.APPROVED, farmer_markets__farmer__user__is_active=True,
)
ACCENT_INSENSITIVE = 'utf8mb4_0900_ai_ci'


def day_param(params) -> int | None:
    raw = params.get('day', '').strip()
    if not raw:
        return None
    if raw not in {'1', '2', '3', '4', '5', '6', '7'}:
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors={'day': ['Thứ trong tuần từ 1 đến 7']})
    return int(raw)


def public_markets(request, point=None):
    """Active markets (Pass 4B §6.2) with farmer_count, and distance / is_favorite when they apply."""
    queryset = (
        Market.objects.filter(is_active=True)
        .annotate(farmer_count=Count('farmer_markets', filter=SELLING_FARMER, distinct=True))
        .prefetch_related(Prefetch('operating_days', queryset=MarketOperatingDay.objects.order_by('day_of_week')))
    )
    if point:
        queryset = queryset.annotate(distance_km=distance_km(point))
    if is_customer(request.user):
        favorite = FavoriteMarket.objects.filter(customer=request.user, market=OuterRef('pk'))
        queryset = queryset.annotate(is_favorite=Exists(favorite))
    return queryset


class MarketPublicListView(APIView):
    """PU-03: `q`, `day` (1-7), `lat` + `lng`, `ordering` = name | distance (distance needs lat/lng)."""

    permission_classes = [AllowAny]

    def get(self, request):
        params = request.query_params
        point = read_point(params)
        ordering = params.get('ordering', 'name').strip() or 'name'
        if ordering not in {'name', 'distance'} or (ordering == 'distance' and not point):
            raise BusinessValidationError(
                'Dữ liệu không hợp lệ', errors={'ordering': ['Sắp xếp theo khoảng cách cần vị trí (lat, lng)']
                                                if ordering == 'distance' else ['Kiểu sắp xếp không hợp lệ']},
            )
        queryset = public_markets(request, point)
        if q := params.get('q', '').strip():
            queryset = queryset.annotate(name_search=Collate('name', ACCENT_INSENSITIVE)).filter(
                Q(name_search__icontains=q) | Q(address__icontains=q),
            )
        if (day := day_param(params)) is not None:
            queryset = queryset.filter(operating_days__day_of_week=day)
        queryset = queryset.order_by('distance_km', 'name') if ordering == 'distance' else queryset.order_by('name')
        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            MarketSummarySerializer(page, many=True, context={'request': request}).data,
        )


class MarketPublicDetailView(APIView):
    """PU-04: an inactive market is 404 to the public."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        market = get_object_or_404(public_markets(request, read_point(request.query_params)), pk=pk)
        data = MarketDetailSerializer(market, context={'request': request}).data
        return api_response(message='Lấy thông tin chợ thành công', data=data, request=request)


class MarketPublicFarmersView(APIView):
    """PU-05: public farmers selling at this market, with their stall label here; `day` keeps
    farmers with an active pickup slot at this market on that weekday."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        get_object_or_404(Market, pk=pk, is_active=True)
        queryset = public_farmers(request.user).filter(farmer_markets__market_id=pk)
        if (day := day_param(request.query_params)) is not None:
            queryset = queryset.filter(
                farmer_markets__market_id=pk,
                farmer_markets__pickup_slots__day_of_week=day,
                farmer_markets__pickup_slots__is_active=True,
            )
        queryset = queryset.distinct().order_by('stall_name')
        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = FarmerSummarySerializer(page, many=True, context={'request': request, 'market_id': pk}).data
        return paginator.get_paginated_response(data)
