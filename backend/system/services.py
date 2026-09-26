from typing import Any

from marketlink_core.context import get_request_id
from marketlink_core.http import client_ip, normalize_request_id
from system.models import AuditLog

SENSITIVE_KEY_PARTS = ("password", "token", "secret", "credential", "authorization", "api_key")
REDACTED = "[REDACTED]"


def _scrub(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: REDACTED
            if any(part in str(key).lower() for part in SENSITIVE_KEY_PARTS)
            else _scrub(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_scrub(item) for item in value]
    return value


def _truncate(value: str | None, limit: int) -> str | None:
    return value[:limit] if value else None


def log_security_event(
    *,
    action: str,
    user: Any | None,
    endpoint: str | None,
    method: str | None,
    ip_address: str | None,
    user_agent: str | None,
    status_code: int | None,
    request_id: str | None,
    details: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        user=user if user is not None and getattr(user, "is_authenticated", False) else None,
        action=action,
        endpoint=_truncate(endpoint, 255),
        method=_truncate(method, 10),
        ip_address=ip_address,
        user_agent=_truncate(user_agent, 255),
        status_code=status_code,
        request_id=normalize_request_id(request_id),
        details=_scrub(details or {}),
    )


def log_request_event(
    request: Any,
    *,
    action: str,
    status_code: int | None,
    user: Any | None = None,
    details: dict | None = None,
) -> AuditLog:
    return log_security_event(
        action=action,
        user=user if user is not None else getattr(request, "user", None),
        endpoint=request.get_full_path(),
        method=request.method,
        ip_address=client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT"),
        status_code=status_code,
        request_id=getattr(request, "id", None) or get_request_id(),
        details=details,
    )
