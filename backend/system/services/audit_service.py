from marketlink_core.context import get_request_id
from system.models import AuditLog


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_security_event(request, *, action: str, status_code: int, user=None, details: dict | None = None) -> AuditLog:
    """Must be called outside any atomic block that may roll back (Implementation Notes §1)."""
    if user is None and getattr(request, "user", None) is not None and request.user.is_authenticated:
        user = request.user
    return AuditLog.objects.create(
        user=user,
        action=action,
        endpoint=request.path[:255],
        method=request.method,
        ip_address=_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255] or None,
        status_code=status_code,
        request_id=get_request_id(),
        details=details or {},
    )
