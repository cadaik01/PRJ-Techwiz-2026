"""
Module: accounts.auth.views_auth
Description: Authentication endpoints - login, refresh, logout, profile, password
             change and WebSocket ticket issuing.
"""

from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.services.password_service import change_password
from accounts.services.token_service import issue_pair, revoke_token
from accounts.services.ws_ticket_service import issue_ticket
from core.responses import api_response

from .serializers_auth import (
    ChangePasswordWriteSerializer,
    LoginWriteSerializer,
    RefreshWriteSerializer,
    UserReadSerializer,
)


class LoginView(APIView):
    """Exchange email and password for a JWT pair."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        # One generic message for both a wrong password and an unknown address,
        # so the response cannot be used to enumerate accounts.
        if user is None or not user.is_active:
            return api_response(
                success=False,
                message='Invalid credentials.',
                errors={'detail': ['Invalid credentials.']},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return api_response(
            message='Signed in.',
            data={**issue_pair(user=user), 'user': UserReadSerializer(user).data},
        )


class RefreshView(APIView):
    """Rotate a refresh token into a new access token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data['refresh'])
        except TokenError:
            return api_response(
                success=False,
                message='Invalid or expired refresh token.',
                errors={'refresh': ['Invalid or expired refresh token.']},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return api_response(message='Token refreshed.', data={'access': str(refresh.access_token)})


class LogoutView(APIView):
    """Revoke the caller's access token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth is not None:
            revoke_token(token=request.auth)
        return api_response(message='Signed out.')


class MeView(APIView):
    """Return the authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_response(message='Profile retrieved.', data=UserReadSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Change the caller's own password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data['current_password']):
            return api_response(
                success=False,
                message='Validation failed.',
                errors={'current_password': ['Incorrect password.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        change_password(user=request.user, new_password=serializer.validated_data['new_password'])
        # The old token outlives the password it was issued against, so burn it.
        if request.auth is not None:
            revoke_token(token=request.auth)
        return api_response(message='Password changed. Please sign in again.')


class WebSocketTicketView(APIView):
    """Issue a single-use ticket for the WebSocket handshake."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return api_response(message='Ticket issued.', data={'ticket': issue_ticket(user=request.user)})
