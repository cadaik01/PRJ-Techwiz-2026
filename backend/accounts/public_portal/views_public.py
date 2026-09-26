from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from accounts.public_portal.context import farmer_context
from accounts.public_portal.serializers_public import (
    FarmerPublicSerializer,
    FarmerSummarySerializer,
)
from accounts.selectors import pickup_windows, public_farmer, public_farmers
from marketlink_core.geo import parse_coordinates
from marketlink_core.responses import api_response
from markets.models import DayOfWeek

FARMER_ORDERINGS = ["rating", "in_stock", "distance", "name"]
FARMER_PARAMS = [
    OpenApiParameter("q", str, description="Matches the stall name or address."),
    OpenApiParameter("market_id", int),
    OpenApiParameter("day", int, enum=list(DayOfWeek.values)),
    OpenApiParameter("category_id", int),
    OpenApiParameter("lat", float),
    OpenApiParameter("lng", float),
    OpenApiParameter("ordering", str, enum=FARMER_ORDERINGS),
]


def optional_int(raw: str | None) -> int | None:
    try:
        return int(raw) if raw is not None else None
    except ValueError:
        return None


def weekday(raw: str | None) -> int | None:
    value = optional_int(raw)
    return value if value in DayOfWeek.values else None


class PublicFarmerListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = FarmerSummarySerializer

    @extend_schema(parameters=FARMER_PARAMS, responses={200: FarmerSummarySerializer(many=True)})
    def get(self, request, *args, **kwargs):
        params = request.query_params
        queryset = public_farmers(
            q=params.get("q"),
            market_id=optional_int(params.get("market_id")),
            day=weekday(params.get("day")),
            category_id=optional_int(params.get("category_id")),
            coordinates=parse_coordinates(params),
            ordering=params.get("ordering"),
        )
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True, context=farmer_context(request, page))
        return self.paginator.get_paginated_response(serializer.data)


class PublicFarmerDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = FarmerPublicSerializer
    lookup_url_kwarg = "id"

    def get_queryset(self):
        return public_farmers()

    @extend_schema(responses={200: FarmerPublicSerializer, 404: None})
    def get(self, request, *args, **kwargs):
        farmer = public_farmer(farmer_id=kwargs["id"])
        context = farmer_context(request, [farmer])
        context["pickup_windows"] = pickup_windows(farmer_id=farmer.pk)
        serializer = FarmerPublicSerializer(farmer, context=context)
        return api_response(message="OK", request=request, data=serializer.data)
