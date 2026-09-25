from datetime import date
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Count, Sum
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from marketlink_core.exceptions import (
    BusinessValidationError,
    ErrorCode,
    ResourceNotFoundError,
)
from marketlink_core.http import parse_if_match
from marketlink_core.pagination import StandardPagination
from marketlink_core.permissions import IsFarmer
from marketlink_core.responses import api_response
from orders.farmer.serializers_farmer import (
    DeclineOrderSerializer,
    FarmerOrderDetailSerializer,
    FarmerOrderListSerializer,
    PrepListItemSerializer,
    RejectChangeRequestSerializer,
)
from orders.models import ActorRole, Order, OrderItem, OrderStatus
from orders.services.expiry import expire_overdue_orders
from orders.services.farmer_change_request import approve_change_request, reject_change_request
from orders.services.fsm import transition_order


class FarmerBaseOrderView(APIView):
    permission_classes = [IsFarmer]


class FarmerOrderListView(FarmerBaseOrderView):
    pagination_class = StandardPagination

    def get(self, request: Request) -> Response:
        farmer_id = request.user.pk
        # Trigger lazy cleanup before calculating tab counts and listing orders
        expire_overdue_orders(farmer_id=farmer_id)

        base_qs = Order.objects.filter(farmer_id=farmer_id)

        market_id = request.query_params.get("market_id")
        if market_id:
            try:
                base_qs = base_qs.filter(market_id=int(market_id))
            except ValueError:
                pass

        date_param = request.query_params.get("date")
        if date_param:
            try:
                parsed_date = date.fromisoformat(date_param)
                base_qs = base_qs.filter(pickup_date=parsed_date)
            except ValueError:
                pass

        tab_counts = {
            "pending": base_qs.filter(status=OrderStatus.PLACED).count(),
            "confirmed": base_qs.filter(
                status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP]
            ).count(),
            "history": base_qs.filter(
                status__in=[
                    OrderStatus.COMPLETED,
                    OrderStatus.CANCELLED,
                    OrderStatus.DECLINED,
                    OrderStatus.NO_SHOW,
                    OrderStatus.EXPIRED,
                ]
            ).count(),
            "change_requests": base_qs.filter(
                status=OrderStatus.ACCEPTED, pending_change__isnull=False
            ).count(),
        }

        tab = request.query_params.get("tab", "PENDING").upper()
        if tab == "PENDING":
            qs = base_qs.filter(status=OrderStatus.PLACED).order_by("created_at", "id")
        elif tab == "CONFIRMED":
            qs = base_qs.filter(
                status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP]
            ).order_by("pickup_start_at", "id")
        elif tab == "HISTORY":
            qs = base_qs.filter(
                status__in=[
                    OrderStatus.COMPLETED,
                    OrderStatus.CANCELLED,
                    OrderStatus.DECLINED,
                    OrderStatus.NO_SHOW,
                    OrderStatus.EXPIRED,
                ]
            ).order_by("-created_at", "-id")
        else:
            qs = base_qs.order_by("-created_at", "-id")

        if request.query_params.get("change_requested", "").lower() == "true":
            qs = qs.filter(pending_change__isnull=False)

        qs = qs.select_related("customer", "customer__customer_profile", "market", "pickup_slot").prefetch_related(
            "items", "items__product"
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = FarmerOrderListSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["data"]["tab_counts"] = tab_counts
        return response


class FarmerOrderDetailView(FarmerBaseOrderView):
    def get(self, request: Request, order_id: int) -> Response:
        order = (
            Order.objects.filter(id=order_id, farmer_id=request.user.pk)
            .select_related("customer", "customer__customer_profile", "market", "pickup_slot")
            .prefetch_related("items", "items__product", "status_history")
            .first()
        )
        if not order:
            raise ResourceNotFoundError("Order not found.", code=ErrorCode.NOT_FOUND)

        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="OK", data=serializer.data, request=request)


class FarmerOrderAcceptView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        order = transition_order(
            order_id=order_id,
            to_status=OrderStatus.ACCEPTED,
            actor=request.user,
            actor_role=ActorRole.FARMER,
            expected_version=version,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Order accepted successfully.", data=serializer.data, request=request)


class FarmerOrderDeclineView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        serializer = DeclineOrderSerializer(data=request.data)
        if not serializer.is_valid():
            raise BusinessValidationError(
                "Invalid decline data.",
                code=ErrorCode.VALIDATION_ERROR,
                errors=serializer.errors,
            )

        reason = serializer.validated_data["reason"]
        mark_sold_out_ids = serializer.validated_data.get("mark_sold_out_product_ids", [])

        with transaction.atomic():
            if mark_sold_out_ids:
                products = list(
                    Product.objects.filter(id__in=mark_sold_out_ids, farmer_id=request.user.pk).select_for_update()
                )
                for product in products:
                    product.stock_quantity = 0
                    product.save(update_fields=["stock_quantity", "updated_at"])

            order = transition_order(
                order_id=order_id,
                to_status=OrderStatus.DECLINED,
                actor=request.user,
                actor_role=ActorRole.FARMER,
                expected_version=version,
                reason=reason,
            )

        detail_serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Order declined successfully.", data=detail_serializer.data, request=request)


class FarmerOrderReadyView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        order = transition_order(
            order_id=order_id,
            to_status=OrderStatus.READY_FOR_PICKUP,
            actor=request.user,
            actor_role=ActorRole.FARMER,
            expected_version=version,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Order is ready for pickup.", data=serializer.data, request=request)


class FarmerOrderCompleteView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        order = transition_order(
            order_id=order_id,
            to_status=OrderStatus.COMPLETED,
            actor=request.user,
            actor_role=ActorRole.FARMER,
            expected_version=version,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Order completed successfully.", data=serializer.data, request=request)


class FarmerOrderNoShowView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        order = transition_order(
            order_id=order_id,
            to_status=OrderStatus.NO_SHOW,
            actor=request.user,
            actor_role=ActorRole.FARMER,
            expected_version=version,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Order marked as no-show.", data=serializer.data, request=request)


class FarmerOrderApproveChangeView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        order = approve_change_request(
            order_id=order_id,
            farmer_id=request.user.pk,
            expected_version=version,
            actor=request.user,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Change request approved.", data=serializer.data, request=request)


class FarmerOrderRejectChangeView(FarmerBaseOrderView):
    def post(self, request: Request, order_id: int) -> Response:
        version = parse_if_match(request)
        serializer = RejectChangeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            raise BusinessValidationError(
                "Invalid rejection data.",
                code=ErrorCode.VALIDATION_ERROR,
                errors=serializer.errors,
            )

        reason = serializer.validated_data.get("reason")
        order = reject_change_request(
            order_id=order_id,
            farmer_id=request.user.pk,
            expected_version=version,
            actor=request.user,
            reason=reason,
        )
        serializer = FarmerOrderDetailSerializer(order)
        return api_response(message="Change request rejected.", data=serializer.data, request=request)


class FarmerOrderPrepListView(FarmerBaseOrderView):
    def get(self, request: Request) -> Response:
        farmer_id = request.user.pk
        expire_overdue_orders(farmer_id=farmer_id)

        items_qs = OrderItem.objects.filter(
            order__farmer_id=farmer_id,
            order__status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP],
        )

        market_id = request.query_params.get("market_id")
        if market_id:
            try:
                items_qs = items_qs.filter(order__market_id=int(market_id))
            except ValueError:
                pass

        date_param = request.query_params.get("date")
        if date_param:
            try:
                parsed_date = date.fromisoformat(date_param)
                items_qs = items_qs.filter(order__pickup_date=parsed_date)
            except ValueError:
                pass

        aggregated = (
            items_qs.values("product_id", "product_name", "unit")
            .annotate(
                total_quantity=Sum("quantity"),
                order_count=Count("order_id", distinct=True),
            )
            .order_by("product_name")
        )

        serializer = PrepListItemSerializer(aggregated, many=True)
        return api_response(message="OK", data=serializer.data, request=request)


class FarmerOrderGroupedByCustomerView(FarmerBaseOrderView):
    def get(self, request: Request) -> Response:
        farmer_id = request.user.pk
        expire_overdue_orders(farmer_id=farmer_id)

        orders_qs = (
            Order.objects.filter(
                farmer_id=farmer_id,
                status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP],
            )
            .select_related("customer", "customer__customer_profile", "market")
            .prefetch_related("items")
        )

        market_id = request.query_params.get("market_id")
        if market_id:
            try:
                orders_qs = orders_qs.filter(market_id=int(market_id))
            except ValueError:
                pass

        date_param = request.query_params.get("date")
        if date_param:
            try:
                parsed_date = date.fromisoformat(date_param)
                orders_qs = orders_qs.filter(pickup_date=parsed_date)
            except ValueError:
                pass

        grouped: dict[tuple[int, str], dict[str, Any]] = {}
        for order in orders_qs.order_by("pickup_date", "customer_id", "pickup_start_at"):
            key = (order.customer_id, str(order.pickup_date))
            profile = getattr(order.customer, "customer_profile", None)
            if key not in grouped:
                grouped[key] = {
                    "customer_id": order.customer_id,
                    "customer_name": profile.full_name if profile else order.customer.email,
                    "customer_phone": profile.phone if profile else "",
                    "pickup_date": str(order.pickup_date),
                    "order_count": 0,
                    "total_amount": Decimal("0.00"),
                    "orders": [],
                }
            group = grouped[key]
            group["order_count"] += 1
            group["total_amount"] += order.total_amount
            group["orders"].append(
                {
                    "order_id": order.id,
                    "status": order.status,
                    "stall_label": order.stall_label,
                    "total_amount": order.total_amount,
                    "item_count": order.items.count(),
                }
            )

        return api_response(message="OK", data=list(grouped.values()), request=request)
