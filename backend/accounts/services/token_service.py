"""
Module: accounts.services.token_service
Description: Issues, rotates and revokes JWT pairs.
"""

from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.authentication import blacklist_jti, claim_jti
from core.exceptions import TokenBlacklistedError


def _remaining_ttl(token) -> int:
    exp = token.get('exp')
    if not exp:
        return 60
    return max(int(exp - datetime.now(tz=timezone.utc).timestamp()), 1)


def issue_pair(*, user) -> dict[str, str]:
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def rotate_refresh_token(*, raw_refresh: str) -> dict[str, str]:
    """Trade a refresh token for a new pair and blacklist the old refresh token.

    Reusing an already-rotated refresh token raises TOKEN_BLACKLISTED.
    """
    try:
        refresh = RefreshToken(raw_refresh)
    except TokenError as exc:
        raise AuthenticationFailed('Invalid or expired refresh token.') from exc

    if not claim_jti(jti=refresh['jti'], ttl=_remaining_ttl(refresh)):
        raise TokenBlacklistedError()

    user_id = refresh.get(api_settings.USER_ID_CLAIM)
    user = get_user_model().objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        raise AuthenticationFailed('User not found or inactive.')
    return issue_pair(user=user)


def revoke_token(*, token) -> None:
    """Blacklist a validated access or refresh token for the rest of its lifetime."""
    blacklist_jti(jti=token.get('jti'), ttl=_remaining_ttl(token))


def revoke_refresh_token(*, raw_refresh: str, user_id: int) -> None:
    """Blacklist a refresh token at logout. Ignores tokens that are invalid or not the caller's."""
    try:
        refresh = RefreshToken(raw_refresh)
    except TokenError:
        return
    # SimpleJWT stores the user id claim as a string.
    if str(refresh.get(api_settings.USER_ID_CLAIM)) == str(user_id):
        revoke_token(token=refresh)
