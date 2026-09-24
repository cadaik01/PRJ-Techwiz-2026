from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth.serializers_common import build_auth_payload
from accounts.auth.serializers_customer import CustomerRegisterWriteSerializer
from accounts.services.customer_registration_service import register_customer
from marketlink_core.responses import api_response


class CustomerRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = CustomerRegisterWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = register_customer(**serializer.validated_data)
        return api_response(data=build_auth_payload(user), message="Registration successful", status=201)
