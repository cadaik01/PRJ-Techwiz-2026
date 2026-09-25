from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.admin_portal.serializers_admin import (
    CategoryAdminReadSerializer,
    CategoryAdminWriteSerializer,
    ModerationReasonSerializer,
    ProductAdminSerializer,
)
from catalog.models import Product
from catalog.selectors import (
    get_product_for_admin,
    list_categories_for_admin,
    list_products_for_admin,
    markets_for_products,
)
from catalog.services.category_service import delete_category
from catalog.services.product_moderation_service import hide_product, restore_product
from catalog.services.stock import get_held_quantities
from marketlink_core.exceptions import ResourceNotFoundError
from marketlink_core.permissions import IsAdmin
from marketlink_core.responses import api_response
from system.models import AuditAction
from system.services import log_request_event


class CategoryListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        return list_categories_for_admin()

    def get_serializer_class(self):
        return (
            CategoryAdminWriteSerializer
            if self.request.method == "POST"
            else CategoryAdminReadSerializer
        )

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_response(message="OK", request=request, data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return api_response(
            message="Category created.",
            request=request,
            data=CategoryAdminReadSerializer(category).data,
            status_code=201,
        )


class CategoryDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    lookup_url_kwarg = "id"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return list_categories_for_admin()

    def get_serializer_class(self):
        return (
            CategoryAdminWriteSerializer
            if self.request.method == "PATCH"
            else CategoryAdminReadSerializer
        )

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return api_response(message="OK", request=request, data=serializer.data)

    def update(self, request, *args, **kwargs):
        category = self.get_object()
        serializer = self.get_serializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Re-read through the selector so product_count is annotated again.
        updated = self.get_queryset().get(pk=category.pk)
        return api_response(
            message="Category updated.",
            request=request,
            data=CategoryAdminReadSerializer(updated).data,
        )

    def destroy(self, request, *args, **kwargs):
        delete_category(category_id=self.get_object().pk)
        # 204 carries no body (Pass 4B §2.1), so this one response skips the envelope.
        return Response(status=status.HTTP_204_NO_CONTENT)


def _flag(raw: str | None) -> bool | None:
    if raw is None:
        return None
    lowered = raw.strip().lower()
    if lowered in ("true", "1"):
        return True
    if lowered in ("false", "0"):
        return False
    return None


def _int(raw: str | None) -> int | None:
    try:
        return int(raw) if raw is not None else None
    except ValueError:
        return None


def _product_context(products) -> dict:
    ids = [product.pk for product in products]
    return {
        "held_quantities": get_held_quantities(product_ids=ids),
        "markets": markets_for_products(product_ids=ids),
    }


class ProductModerationListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ProductAdminSerializer

    def get_queryset(self):
        params = self.request.query_params
        return list_products_for_admin(
            q=params.get("q"),
            farmer_id=_int(params.get("farmer_id")),
            is_hidden=_flag(params.get("is_hidden")),
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, description="Matches the product name or stall name."),
            OpenApiParameter("farmer_id", int),
            OpenApiParameter("is_hidden", bool),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        serializer = self.get_serializer(page, many=True, context=_product_context(page))
        return self.paginator.get_paginated_response(serializer.data)


class _ProductModerationView(APIView):
    permission_classes = [IsAdmin]

    def _respond(self, request, *, product_id: int, action: str, message: str) -> Response:
        product = get_product_for_admin(product_id=product_id)
        # Audit rows are written after the business transaction so a rollback cannot erase them.
        log_request_event(
            request,
            action=action,
            status_code=200,
            details={"product_id": product_id, "reason": product.hidden_reason},
        )
        serializer = ProductAdminSerializer(product, context=_product_context([product]))
        return api_response(message=message, request=request, data=serializer.data)


class ProductHideView(_ProductModerationView):
    @extend_schema(
        request=ModerationReasonSerializer,
        responses={200: ProductAdminSerializer, 404: None},
        summary="Hide a product",
    )
    def post(self, request, id: int) -> Response:
        _require_product(id)
        serializer = ModerationReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hide_product(
            product_id=id, reason=serializer.validated_data["reason"], actor=request.user
        )
        return self._respond(
            request,
            product_id=id,
            action=AuditAction.PRODUCT_HIDDEN,
            message="Product hidden.",
        )


class ProductRestoreView(_ProductModerationView):
    @extend_schema(
        request=None, responses={200: ProductAdminSerializer, 404: None}, summary="Restore a product"
    )
    def post(self, request, id: int) -> Response:
        _require_product(id)
        restore_product(product_id=id)
        return self._respond(
            request,
            product_id=id,
            action=AuditAction.PRODUCT_RESTORED,
            message="Product restored.",
        )


def _require_product(product_id: int) -> int:
    if not Product.objects.filter(pk=product_id).exists():
        raise ResourceNotFoundError("Product not found.")
    return product_id
