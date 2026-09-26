from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth.serializers_auth import FarmerRegisterAuthSerializer, build_me
from accounts.services.registration import register_farmer
from accounts.services.tokens import issue_token_pair
from marketlink_core.responses import api_response


class FarmerRegisterView(APIView):
    """AU-02: POST /api/auth/register/farmer/ -> { access, refresh, user: Me }, farmer_status PENDING."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request: Request) -> Response:
        serializer = FarmerRegisterAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, _ = register_farmer(**serializer.validated_data)
        return api_response(
            message="Registration successful. Your account is awaiting administrator approval.",
            data={**issue_token_pair(user), "user": build_me(user)},
            status_code=status.HTTP_201_CREATED,
            request=request,
        )
