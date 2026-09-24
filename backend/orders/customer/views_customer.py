from django.db import transaction
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from marketlink_core.http import require_idempotency_key
from marketlink_core.permissions import IsCustomer
from marketlink_core.responses import api_response
from marketlink_core.services.db_retry import run_with_deadlock_retry
from orders.customer.serializers_customer import CheckoutWriteSerializer, OrderSummaryReadSerializer
from orders.selectors import order_summary_queryset
from orders.services.checkout_service import place_orders
from orders.services.idempotency_service import run_idempotent


def _checkout_with_summaries(*, customer, groups) -> list:
    # The response is built inside the same transaction: if it fails the orders roll back too, so the
    # idempotency key can safely be released and a retry cannot create the orders a second time.
    with transaction.atomic():
        orders = place_orders(customer=customer, groups=groups)
        return OrderSummaryReadSerializer(order_summary_queryset([order.pk for order in orders]), many=True).data


def _place_orders(request) -> tuple[int, dict]:
    serializer = CheckoutWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    summaries = run_with_deadlock_retry(
        _checkout_with_summaries, customer=request.user, groups=serializer.validated_data["groups"]
    )
    return 201, api_response(
        message=f"Placed {len(summaries)} order(s) successfully", data={"orders": summaries}, status_code=201, request=request
    ).data


class CustomerOrdersView(APIView):
    permission_classes = [IsCustomer]
    throttle_scope = "orders"

    def get_throttles(self):
        # Pass 4B §1.4 / D-005 guard 3: every POST to this endpoint counts toward "orders" (10/hour);
        # modify and cancel live on other endpoints and are not limited by it.
        return [ScopedRateThrottle()] if self.request.method == "POST" else super().get_throttles()

    def post(self, request):
        key = require_idempotency_key(request)
        result = run_idempotent(user_id=request.user.pk, key=key, payload=request.data, action=lambda: _place_orders(request))
        headers = {"Idempotent-Replayed": "true"} if result.replayed else None
        return Response(result.body, status=result.status, headers=headers)
