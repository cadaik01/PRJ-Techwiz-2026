"""
Module: accounts.authentication
Description: JWT authentication with a cache-backed token blacklist.

Revoked token ids live in the cache (Redis in production) as blacklist:<jti> with a
TTL equal to the token's remaining lifetime, so they expire on their own and no
token_blacklist tables grow in MySQL. If the cache is unreachable, requests still
authenticate on the signature alone rather than failing closed, so a Redis outage
does not lock everyone out.
"""

import logging

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.exceptions import TokenBlacklistedError

logger = logging.getLogger(__name__)

BLACKLIST_KEY = 'blacklist:{jti}'


def blacklist_jti(*, jti: str, ttl: int) -> None:
    try:
        cache.set(BLACKLIST_KEY.format(jti=jti), '1', timeout=ttl)
    except Exception:
        logger.exception('Token blacklist write failed')


def claim_jti(*, jti: str, ttl: int) -> bool:
    """Blacklist a jti only if it is not already. True if this call claimed it.

    cache.add() is set-if-absent, so two concurrent refreshes with the same token
    cannot both succeed.
    """
    try:
        return cache.add(BLACKLIST_KEY.format(jti=jti), '1', timeout=ttl)
    except Exception:
        logger.exception('Token blacklist write failed')
        return True


def is_blacklisted(*, jti: str) -> bool:
    try:
        return cache.get(BLACKLIST_KEY.format(jti=jti)) is not None
    except Exception:
        logger.exception('Token blacklist read failed')
        return False


class ProjectJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that also rejects blacklisted access tokens."""

    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        if is_blacklisted(jti=token.get('jti')):
            raise TokenBlacklistedError()
        return token
