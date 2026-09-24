from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from marketlink_core.db import run_with_deadlock_retry
from marketlink_core.headers import require_idempotency_key
from marketlink_core.permissions import IsCustomer
from marketlink_core.responses import api_response
from orders.customer.serializers_customer import CheckoutWriteSerializer, OrderSummaryReadSerializer
from orders.services.checkout_service import place_orders
from orders.services.idempotency_service import run_idempotent


def _place_orders(request) -> tuple[int, dict]:
    serializer = CheckoutWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    orders = run_with_deadlock_retry(place_orders, customer=request.user, groups=serializer.validated_data["groups"])
    data = {"orders": OrderSummaryReadSerializer(orders, many=True).data}
    return 201, api_response(data=data, message=f"Placed {len(orders)} order(s) successfully").data


class CustomerOrdersView(APIView):
    permission_classes = [IsCustomer]
    throttle_scope = "orders"

    def get_throttles(self):
        # D-005 guard 3: only order creation counts toward the 10/hour limit.
        return [ScopedRateThrottle()] if self.request.method == "POST" else super().get_throttles()

    def post(self, request):
        key = require_idempotency_key(request)
        result = run_idempotent(user_id=request.user.pk, key=key, payload=request.data, action=lambda: _place_orders(request))
        headers = {"Idempotent-Replayed": "true"} if result.replayed else None
        return Response(result.body, status=result.status, headers=headers)
