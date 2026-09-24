from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth.serializers_common import (
    ChangePasswordWriteSerializer,
    LoginWriteSerializer,
    MeReadSerializer,
    RefreshTokenWriteSerializer,
    build_auth_payload,
)
from accounts.auth.tokens import SESSION_CLAIM
from accounts.services.auth_service import authenticate_user, change_password, logout, rotate_refresh_token
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


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RefreshTokenWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return api_response(data=rotate_refresh_token(**serializer.validated_data))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefreshTokenWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        logout(user=request.user, session_id=request.auth[SESSION_CLAIM], **serializer.validated_data)
        log_security_event(request, action=AuditAction.LOGOUT, status_code=204)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_response(data=MeReadSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    # Shares the login rate (5/min), keyed per user, to stop guessing the current password with a stolen token.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = ChangePasswordWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        change_password(user=request.user, session_id=request.auth[SESSION_CLAIM], **serializer.validated_data)
        log_security_event(request, action=AuditAction.PASSWORD_CHANGED, status_code=200)
        return api_response(message="Password changed successfully")
