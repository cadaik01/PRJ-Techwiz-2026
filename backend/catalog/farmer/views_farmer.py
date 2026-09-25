from decimal import Decimal
from typing import Any

from django.db.models import Q
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import FarmerProfile, FarmerStatus
from catalog.farmer.serializers_farmer import (
    FarmerProductCreateSerializer,
    FarmerProductSerializer,
    FarmerProductUpdateSerializer,
)
from catalog.models import Category, Product
from catalog.services.farmer_product import (
    apply_weekly_template,
    notify_restock_for_product,
    preview_weekly_template,
)
from catalog.services.stock import get_pending_quantities
from marketlink_core.exceptions import (
    ErrorCode,
    ForbiddenActionError,
    ResourceNotFoundError,
    UnprocessableEntityError,
)
from marketlink_core.pagination import StandardPagination
from marketlink_core.permissions import IsFarmer
from marketlink_core.responses import api_response


class FarmerBaseProductView(APIView):
    permission_classes = [IsFarmer]

    def _get_farmer_profile(self, request: Request) -> FarmerProfile:
        profile = getattr(request.user, "farmer_profile", None)
        if not profile:
            raise ResourceNotFoundError(
                "Farmer profile not found.", code=ErrorCode.NOT_FOUND
            )
        return profile

    def _check_farmer_approved(self, profile: FarmerProfile) -> None:
        if profile.status != FarmerStatus.APPROVED:
            raise ForbiddenActionError(
                "Only approved farmers can perform this action.",
                code=ErrorCode.FARMER_NOT_APPROVED,
            )

    def _get_farmer_product(self, profile: FarmerProfile, pk: int) -> Product:
        product = Product.objects.filter(pk=pk, farmer=profile).first()
        if not product:
            raise ResourceNotFoundError(
                "Product not found.", code=ErrorCode.NOT_FOUND
            )
        return product


class FarmerProductListView(FarmerBaseProductView):
    pagination_class = StandardPagination

    def get(self, request: Request) -> Response:
        """FA-11: List farmer products with filtering, search, and pending stock."""
        profile = self._get_farmer_profile(request)
        qs = Product.objects.filter(farmer=profile).select_related("category")

        # 1. Search filter
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

        # 2. Category filter
        cat_id = request.query_params.get("category_id")
        if cat_id:
            qs = qs.filter(category_id=cat_id)

        # 3. State filter
        state = request.query_params.get("state")
        if state == "in_stock":
            qs = qs.filter(
                is_archived=False,
                is_hidden_by_admin=False,
                is_available=True,
                stock_quantity__gt=0,
            )
        elif state == "out_of_stock":
            qs = qs.filter(
                is_archived=False,
                is_hidden_by_admin=False,
                stock_quantity=0,
            )
        elif state == "unavailable":
            qs = qs.filter(is_archived=False, is_available=False)
        elif state == "hidden":
            qs = qs.filter(is_hidden_by_admin=True)
        elif state == "archived":
            qs = qs.filter(is_archived=True)
        else:
            # Default excludes archived products
            qs = qs.filter(is_archived=False)

        qs = qs.order_by("-created_at")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            pids = [p.id for p in page]
            pending_dict = get_pending_quantities(product_ids=pids)
            serializer = FarmerProductSerializer(
                page,
                many=True,
                context={"request": request, "pending_quantities": pending_dict},
            )
            return paginator.get_paginated_response(serializer.data)

        pids = [p.id for p in qs]
        pending_dict = get_pending_quantities(product_ids=pids)
        serializer = FarmerProductSerializer(
            qs,
            many=True,
            context={"request": request, "pending_quantities": pending_dict},
        )
        return api_response(message="OK", data=serializer.data, request=request)

    def post(self, request: Request) -> Response:
        """FA-12: Create new farmer product (Farmer APPROVED required)."""
        profile = self._get_farmer_profile(request)
        self._check_farmer_approved(profile)

        serializer = FarmerProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        category = Category.objects.get(id=validated["category_id"])

        product = Product.objects.create(
            farmer=profile,
            category=category,
            name=validated["name"].strip(),
            price=validated["price"],
            unit=validated["unit"],
            stock_quantity=validated["stock_quantity"],
            weekly_default_quantity=validated.get("weekly_default_quantity"),
            description=validated.get("description"),
            image=validated.get("image"),
            is_available=validated.get("is_available", True),
        )

        res_serializer = FarmerProductSerializer(
            product, context={"request": request, "pending_quantities": {product.id: 0}}
        )
        return api_response(
            message="Product created successfully.",
            data=res_serializer.data,
            status_code=status.HTTP_201_CREATED,
            request=request,
        )


class FarmerProductDetailView(FarmerBaseProductView):
    def get(self, request: Request, pk: int) -> Response:
        """FA-13: Get product details."""
        profile = self._get_farmer_profile(request)
        product = self._get_farmer_product(profile, pk)
        serializer = FarmerProductSerializer(product, context={"request": request})
        return api_response(message="OK", data=serializer.data, request=request)

    def patch(self, request: Request, pk: int) -> Response:
        """FA-14: Update product details and trigger restock notifications if applicable."""
        profile = self._get_farmer_profile(request)
        self._check_farmer_approved(profile)
        product = self._get_farmer_product(profile, pk)

        if product.is_archived or product.is_hidden_by_admin:
            raise UnprocessableEntityError(
                "Cannot modify an archived or admin-hidden product.",
                code=ErrorCode.FAILED_PRECONDITION,
            )

        serializer = FarmerProductUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        old_stock = product.stock_quantity

        if "category_id" in validated:
            product.category = Category.objects.get(id=validated["category_id"])
        if "name" in validated:
            product.name = validated["name"].strip()
        if "price" in validated:
            product.price = validated["price"]
        if "unit" in validated:
            product.unit = validated["unit"]
        if "stock_quantity" in validated:
            product.stock_quantity = validated["stock_quantity"]
        if "weekly_default_quantity" in validated:
            product.weekly_default_quantity = validated["weekly_default_quantity"]
        if "description" in validated:
            product.description = validated["description"]
        if "image" in validated:
            product.image = validated["image"]
        if "is_available" in validated:
            product.is_available = validated["is_available"]

        product.save()

        # D-025 trigger: restock from 0 to > 0
        restock_notified = 0
        if (
            old_stock == 0
            and product.stock_quantity > 0
            and product.is_available
            and not product.is_hidden_by_admin
            and not product.is_archived
        ):
            restock_notified = notify_restock_for_product(product=product)

        data = FarmerProductSerializer(product, context={"request": request}).data
        data["restock_notified"] = restock_notified
        return api_response(
            message="Product updated successfully.",
            data=data,
            request=request,
        )

    def delete(self, request: Request, pk: int) -> Response:
        """FA-15: Soft delete product (set is_archived = True)."""
        profile = self._get_farmer_profile(request)
        product = self._get_farmer_product(profile, pk)

        product.is_archived = True
        product.save(update_fields=["is_archived", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FarmerProductMarkSoldOutView(FarmerBaseProductView):
    def post(self, request: Request, pk: int) -> Response:
        """FA-16: Quick mark product as sold out (stock_quantity = 0)."""
        profile = self._get_farmer_profile(request)
        product = self._get_farmer_product(profile, pk)

        product.stock_quantity = 0
        product.save(update_fields=["stock_quantity", "updated_at"])

        serializer = FarmerProductSerializer(product, context={"request": request})
        return api_response(message="OK", data=serializer.data, request=request)


class FarmerWeeklyTemplatePreviewView(FarmerBaseProductView):
    def get(self, request: Request) -> Response:
        """FA-17: Preview weekly stock template calculation (Farmer APPROVED required)."""
        profile = self._get_farmer_profile(request)
        self._check_farmer_approved(profile)

        preview_data = preview_weekly_template(farmer=profile)
        return api_response(message="OK", data=preview_data, request=request)


class FarmerWeeklyTemplateApplyView(FarmerBaseProductView):
    def post(self, request: Request) -> Response:
        """FA-18: Apply weekly stock template with row-locking (Farmer APPROVED required)."""
        profile = self._get_farmer_profile(request)
        self._check_farmer_approved(profile)

        apply_data = apply_weekly_template(farmer=profile)
        return api_response(message="OK", data=apply_data, request=request)
