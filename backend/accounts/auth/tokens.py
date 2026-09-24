import uuid

from django.db import transaction
from django.utils.crypto import salted_hmac
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

SESSION_CLAIM = "sid"
PASSWORD_VERSION_CLAIM = "pwv"


def password_version(user) -> str:
    # HMAC keeps the stored password hash unreadable even though JWT payloads are visible to clients.
    return salted_hmac("accounts.auth.password_version", user.password).hexdigest()[:16]


def issue_tokens(user, *, session_id: str | None = None) -> dict:
    with transaction.atomic():
        refresh = RefreshToken.for_user(user)
        # Claims set on the refresh token are copied into every access token derived from it.
        refresh["role"] = user.role.code
            # One sid per login (device); it survives rotation so a whole device session can be revoked at once.
        refresh[SESSION_CLAIM] = session_id or uuid.uuid4().hex
        refresh[PASSWORD_VERSION_CLAIM] = password_version(user)
        # for_user() stores the token before our claims exist; store the final string so the sid can be read back.
        OutstandingToken.objects.filter(jti=refresh["jti"]).update(token=str(refresh))
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
