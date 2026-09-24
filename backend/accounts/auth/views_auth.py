"""
Module: accounts.auth.views_auth
Description: Authentication endpoints - login, refresh, logout, profile, password
             change and WebSocket ticket issuing.
"""

from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.services.auth_service import authenticate_user
from accounts.services.password_service import change_password
from accounts.services.token_service import (
    issue_pair,
    revoke_refresh_token,
    revoke_token,
    rotate_refresh_token,
)
from core.services.ws_ticket import create_ws_ticket
from core.utils import api_response, audit_request
from system.models import AuditAction

from .serializers_auth import (
    ChangePasswordWriteSerializer,
    LoginWriteSerializer,
    LogoutWriteSerializer,
    RefreshWriteSerializer,
    UserReadSerializer,
)


class LoginView(APIView):
    """Exchange email and password for a JWT pair."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LoginWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate_user(**serializer.validated_data)
        if user is None:
            audit_request(request, action=AuditAction.LOGIN_FAILED, status_code=401,
                          details={'email': serializer.validated_data['email']})
            return api_response(message='Email hoặc mật khẩu không đúng', status_code=401,
                                request=request, code='AUTHENTICATION_FAILED')
        audit_request(request, action=AuditAction.LOGIN, status_code=200, user=user)
        user_data = UserReadSerializer(user, context={'request': request}).data
        return api_response(message='Đăng nhập thành công', request=request,
                            data={**issue_pair(user=user), 'user': user_data})


class RefreshView(APIView):
    """Rotate a refresh token: returns a new pair and blacklists the old refresh token."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RefreshWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pair = rotate_refresh_token(raw_refresh=serializer.validated_data['refresh'])
        return api_response(message='Làm mới phiên đăng nhập thành công', request=request, data=pair)


class LogoutView(APIView):
    """Blacklist the caller's access token and, if sent, their refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('refresh'):
            revoke_refresh_token(raw_refresh=serializer.validated_data['refresh'], user_id=request.user.id)
        if request.auth is not None:
            revoke_token(token=request.auth)
        audit_request(request, action=AuditAction.LOGOUT, status_code=200, user=request.user)
        return api_response(message='Đăng xuất thành công', request=request)


class MeView(APIView):
    """Return the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_data = UserReadSerializer(request.user, context={'request': request}).data
        return api_response(message='Lấy thông tin tài khoản thành công', request=request, data=user_data)


class ChangePasswordView(APIView):
    """Change the caller's own password, then revoke the token it was made with."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        change_password(user=request.user, new_password=serializer.validated_data['new_password'])
        if request.auth is not None:
            revoke_token(token=request.auth)
        audit_request(request, action=AuditAction.PASSWORD_CHANGED, status_code=200, user=request.user)
        return api_response(message='Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', request=request)


class WebSocketTicketView(APIView):
    """Issue a single-use ticket for the WebSocket handshake."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        ticket = create_ws_ticket(user_id=request.user.id, role=request.user.role.code)
        return api_response(message='Cấp vé thành công', request=request,
                            data={'ticket': ticket, 'expires_in': settings.WS_TICKET_TTL})
