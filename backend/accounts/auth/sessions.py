import logging

from django.core.cache import cache
from rest_framework_simplejwt.settings import api_settings as jwt_settings

logger = logging.getLogger(__name__)

_KEY = "auth:revoked_sid:{}"


# The cache only speeds up logout for still-valid access tokens; refresh tokens are revoked in the DB
# and password changes are enforced by the `pwv` claim. A cache outage therefore degrades logout to
# "access token expires within 15 minutes" instead of failing every authenticated request.


def revoke_sessions(session_ids) -> None:
    timeout = int(jwt_settings.ACCESS_TOKEN_LIFETIME.total_seconds())
    try:
        cache.set_many({_KEY.format(sid): True for sid in session_ids}, timeout=timeout)
    except Exception:
        logger.warning("Could not record revoked sessions in cache", exc_info=True)


def is_session_revoked(session_id: str) -> bool:
    try:
        return cache.get(_KEY.format(session_id)) is not None
    except Exception:
        logger.warning("Could not read revoked sessions from cache", exc_info=True)
        return False
