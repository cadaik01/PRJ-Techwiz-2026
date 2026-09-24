from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenBackendError, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.state import token_backend
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.auth.sessions import revoke_sessions
from accounts.auth.tokens import SESSION_CLAIM, issue_tokens
from accounts.exceptions import AccountLockedError, InvalidCredentialsError, TokenInvalidError
from accounts.models import CustomUser

# Lock order (Implementation Notes §3): the users row is locked first, so rotation, logout and
# password change for the same user run one at a time and can never miss each other's tokens.


def _account_locked_error(user: CustomUser) -> AccountLockedError:
    profile = getattr(user, "customer_profile", None)
    reason = profile.deactivation_reason if profile else None
    return AccountLockedError(errors={"reason": [reason]} if reason else None)


def _lock_user(user_id) -> CustomUser | None:
    return (
        CustomUser.objects.select_for_update(of=("self",))
        .select_related("role")
        .filter(pk=user_id)
        .first()
    )


def authenticate_user(*, email: str, password: str) -> CustomUser:
    user = CustomUser.objects.select_related("role").filter(email=email).first()
    if user is None:
        # Hash anyway so unknown emails take as long as wrong passwords (no user enumeration by timing).
        CustomUser().set_password(password)
        raise InvalidCredentialsError()
    if not user.check_password(password):
        raise InvalidCredentialsError()
    if not user.is_active:
        raise _account_locked_error(user)
    return user


def _parse_refresh_token(raw: str) -> RefreshToken:
    try:
        return RefreshToken(raw)
    except TokenError as exc:
        raise TokenInvalidError() from exc


def _decode_refresh_payload(raw: str) -> dict:
    """Signature, expiry and type check only — accepts tokens that were already rotated."""
    try:
        payload = token_backend.decode(raw, verify=True)
    except TokenBackendError as exc:
        raise TokenInvalidError() from exc
    if payload.get(jwt_settings.TOKEN_TYPE_CLAIM) != "refresh":
        raise TokenInvalidError()
    return payload


def _blacklist_sessions(user: CustomUser, *, keep=None, only=None) -> list[str]:
    """Blacklist the user's live refresh tokens, selected by session id. Caller must hold the user lock."""
    live_tokens = OutstandingToken.objects.filter(
        user=user, expires_at__gt=timezone.now(), blacklistedtoken__isnull=True
    )
    revoked_session_ids, to_blacklist = set(), []
    for outstanding in live_tokens:
        # Stored tokens were issued by this server, so the signature check can be skipped when reading the sid.
        session_id = RefreshToken(outstanding.token, verify=False).get(SESSION_CLAIM)
        if session_id == keep or (only is not None and session_id != only):
            continue
        to_blacklist.append(BlacklistedToken(token=outstanding))
        if session_id:
            revoked_session_ids.add(session_id)
    BlacklistedToken.objects.bulk_create(to_blacklist, ignore_conflicts=True)
    return list(revoked_session_ids)


def rotate_refresh_token(*, refresh: str) -> dict:
    token = _parse_refresh_token(refresh)
    session_id = token.get(SESSION_CLAIM)
    if not session_id:
        raise TokenInvalidError()
    with transaction.atomic():
        user = _lock_user(token[jwt_settings.USER_ID_CLAIM])
        if user is None:
            raise TokenInvalidError()
        if not user.is_active:
            raise _account_locked_error(user)
        outstanding = OutstandingToken.objects.filter(jti=token["jti"]).first()
        if outstanding is None or BlacklistedToken.objects.filter(token=outstanding).exists():
            raise TokenInvalidError()
        BlacklistedToken.objects.create(token=outstanding)
        return issue_tokens(user, session_id=session_id)


def logout(*, user: CustomUser, session_id: str, refresh: str) -> None:
    payload = _decode_refresh_payload(refresh)
    if str(payload.get(jwt_settings.USER_ID_CLAIM)) != str(user.pk) or payload.get(SESSION_CLAIM) != session_id:
        raise TokenInvalidError()
    with transaction.atomic():
        _blacklist_sessions(_lock_user(user.pk), only=session_id)
    revoke_sessions([session_id])


def change_password(*, user: CustomUser, current_password: str, new_password: str, session_id: str) -> None:
    with transaction.atomic():
        locked = _lock_user(user.pk)
        if not locked.check_password(current_password):
            raise serializers.ValidationError({"current_password": ["Current password is incorrect"]})
        locked.set_password(new_password)
        locked.must_change_password = False
        locked.save(update_fields=["password", "must_change_password", "updated_at"])
        # New password invalidates every access token via the `pwv` claim; other devices also lose refresh.
        _blacklist_sessions(locked, keep=session_id)
