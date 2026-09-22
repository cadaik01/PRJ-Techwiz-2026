"""
Module: accounts.authentication
Description: JWT authentication with a cache-backed revocation list.

Wraps SimpleJWT so a token can be revoked immediately (logout, forced password
change) without waiting for it to expire. The cache is the fast path; if it is
unavailable the request still authenticates on the signature alone rather than
failing closed, which keeps a Redis outage from locking everyone out.
"""

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

REVOKED_KEY = 'revoked_jti:{jti}'


def revoke(*, jti, ttl):
    """Mark a token id as revoked for the remainder of its lifetime."""
    try:
        cache.set(REVOKED_KEY.format(jti=jti), True, timeout=ttl)
    except Exception:  # noqa: BLE001 - cache outage must not break logout
        pass


def is_revoked(*, jti):
    try:
        return bool(cache.get(REVOKED_KEY.format(jti=jti)))
    except Exception:  # noqa: BLE001 - see module docstring
        return False


class ProjectJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that additionally consults the revocation list."""

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_revoked(jti=token.get('jti')):
            raise InvalidToken('Token has been revoked.')
        return token
