from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth.serializers_common import LoginWriteSerializer, build_auth_payload
from accounts.services.auth_service import authenticate_user
from marketlink_core.exceptions import DomainError
from marketlink_core.responses import api_response
from system.models import AuditAction
from system.services.audit_service import log_security_event


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        try:
            user = authenticate_user(**serializer.validated_data)
        except DomainError as exc:
            log_security_event(request, action=AuditAction.LOGIN_FAILED, status_code=exc.status_code,
                               details={"email": email, "error": exc.code})
            raise
        log_security_event(request, action=AuditAction.LOGIN, status_code=200, user=user)
        return api_response(data=build_auth_payload(user), message="Login successful")
