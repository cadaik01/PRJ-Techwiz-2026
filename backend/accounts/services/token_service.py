"""
Module: accounts.services.token_service
Description: Issues and revokes JWT pairs.
"""

from datetime import datetime, timezone

from rest_framework_simplejwt.tokens import RefreshToken

from accounts.authentication import revoke


def issue_pair(*, user):
    """Return a fresh access/refresh pair for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def revoke_token(*, token):
    """Revoke a validated token for the remainder of its lifetime."""
    exp = token.get('exp')
    ttl = max(int(exp - datetime.now(tz=timezone.utc).timestamp()), 1) if exp else 60
    revoke(jti=token.get('jti'), ttl=ttl)
