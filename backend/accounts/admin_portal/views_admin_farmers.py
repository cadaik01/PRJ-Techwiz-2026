from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.admin_portal.serializers_admin import (
    AdminFarmerRowSerializer,
    AdminReasonSerializer,
    FarmerOrderStatsSerializer,
    FarmerStatusHistorySerializer,
    SuspensionImpactSerializer,
)
from accounts.models import FarmerProfile, FarmerStatus
from accounts.public_portal.context import farmer_context
from accounts.public_portal.serializers_public import FarmerPublicSerializer
from accounts.selectors import (
    farmer_for_admin,
    farmer_order_stats,
    farmer_status_history,
    list_farmers_for_admin,
    pickup_windows,
)
from accounts.services.farmer_status_service import (
    approve_farmer,
    reinstate_farmer,
    reject_farmer,
    suspend_farmer,
    suspension_impact,
)
from catalog.admin_portal.serializers_admin import ProductAdminSerializer
from catalog.selectors import list_products_for_admin, markets_for_products
from catalog.services.stock import get_open_held_quantities, get_pending_quantities
from marketlink_core.exceptions import ResourceNotFoundError
from marketlink_core.permissions import IsAdmin
from marketlink_core.responses import api_response
from system.models import AuditAction
from system.services import log_request_event

DETAIL_PRODUCT_LIMIT = 20


def _require_farmer(farmer_id: int) -> int:
    if not FarmerProfile.objects.filter(pk=farmer_id).exists():
        raise ResourceNotFoundError("Farmer not found.")
    return farmer_id


def _optional_int(raw: str | None) -> int | None:
    try:
        return int(raw) if raw is not None else None
    except ValueError:
        return None


class AdminFarmerListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminFarmerRowSerializer

    def get_queryset(self):
        params = self.request.query_params
        return list_farmers_for_admin(
            status=params.get("status"),
            q=params.get("q"),
            market_id=_optional_int(params.get("market_id")),
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("status", str, enum=list(FarmerStatus.values)),
            OpenApiParameter("q", str, description="Matches the stall name, email or phone."),
            OpenApiParameter("market_id", int),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminFarmerDetailView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: FarmerPublicSerializer, 404: None}, summary="Farmer profile")
    def get(self, request, id: int) -> Response:
        _require_farmer(id)
        farmer = farmer_for_admin(farmer_id=id)
        context = farmer_context(request, [farmer])
        context["pickup_windows"] = pickup_windows(farmer_id=farmer.pk)
        data = FarmerPublicSerializer(farmer, context=context).data

        products = list(list_products_for_admin(farmer_id=farmer.pk)[:DETAIL_PRODUCT_LIMIT])
        product_ids = [product.pk for product in products]
        data.update(
            {
                "email": farmer.user.email,
                "status": farmer.status,
                "status_reason": farmer.status_reason,
                "products": ProductAdminSerializer(
                    products,
                    many=True,
                    context={
                        "held_quantities": get_open_held_quantities(product_ids=product_ids),
                        "pending_quantities": get_pending_quantities(product_ids=product_ids),
                        "markets": markets_for_products(product_ids=product_ids),
                    },
                ).data,
                "order_stats": FarmerOrderStatsSerializer(
                    farmer_order_stats(farmer_id=farmer.pk)
                ).data,
                "status_history": FarmerStatusHistorySerializer(
                    farmer_status_history(farmer_id=farmer.pk), many=True
                ).data,
            }
        )
        return api_response(message="OK", request=request, data=data)


class AdminFarmerSuspensionImpactView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: SuspensionImpactSerializer, 404: None})
    def get(self, request, id: int) -> Response:
        _require_farmer(id)
        data = SuspensionImpactSerializer(suspension_impact(farmer_id=id)).data
        return api_response(message="OK", request=request, data=data)


class _FarmerActionView(APIView):
    permission_classes = [IsAdmin]

    def _row(self, request, farmer_id: int, *, message: str, extra: dict | None = None) -> Response:
        data = AdminFarmerRowSerializer(farmer_for_admin(farmer_id=farmer_id)).data
        if extra:
            data.update(extra)
        return api_response(message=message, request=request, data=data)

    def _audit(self, request, *, action: str, farmer_id: int, details: dict) -> None:
        # Written after the business transaction so a rollback cannot erase the trail.
        log_request_event(
            request, action=action, status_code=200, details={"farmer_id": farmer_id, **details}
        )


class AdminFarmerApproveView(_FarmerActionView):
    @extend_schema(request=None, responses={200: AdminFarmerRowSerializer, 400: None, 404: None})
    def post(self, request, id: int) -> Response:
        approve_farmer(farmer_id=_require_farmer(id), actor=request.user)
        self._audit(request, action=AuditAction.FARMER_APPROVED, farmer_id=id, details={})
        return self._row(request, id, message="Farmer approved.")


class AdminFarmerRejectView(_FarmerActionView):
    @extend_schema(
        request=AdminReasonSerializer, responses={200: AdminFarmerRowSerializer, 400: None, 404: None}
    )
    def post(self, request, id: int) -> Response:
        _require_farmer(id)
        serializer = AdminReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]
        reject_farmer(farmer_id=id, reason=reason, actor=request.user)
        self._audit(
            request, action=AuditAction.FARMER_REJECTED, farmer_id=id, details={"reason": reason}
        )
        return self._row(request, id, message="Farmer rejected.")


class AdminFarmerSuspendView(_FarmerActionView):
    @extend_schema(
        request=AdminReasonSerializer,
        responses={200: AdminFarmerRowSerializer, 400: None, 404: None},
        summary="Suspend a farmer and decline every open order",
    )
    def post(self, request, id: int) -> Response:
        _require_farmer(id)
        serializer = AdminReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]
        _, affected_orders = suspend_farmer(farmer_id=id, reason=reason, actor=request.user)
        self._audit(
            request,
            action=AuditAction.FARMER_SUSPENDED,
            farmer_id=id,
            details={"reason": reason, "affected_orders": affected_orders},
        )
        return self._row(
            request,
            id,
            message="Farmer suspended.",
            extra={"affected_orders": affected_orders},
        )


class AdminFarmerReinstateView(_FarmerActionView):
    @extend_schema(request=None, responses={200: AdminFarmerRowSerializer, 400: None, 404: None})
    def post(self, request, id: int) -> Response:
        reinstate_farmer(farmer_id=_require_farmer(id), actor=request.user)
        self._audit(request, action=AuditAction.FARMER_REINSTATED, farmer_id=id, details={})
        return self._row(request, id, message="Farmer reinstated.")
