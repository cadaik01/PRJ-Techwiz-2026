"""
Module: system.services
Description: Writes security events to audit_logs.

Call these outside the business transaction (ATOMIC_REQUESTS is False), so a rolled
back business operation does not also erase the trace of who attempted it.
"""

import ipaddress
from typing import Any

from core.context import get_request_id
from system.models import AuditLog

SENSITIVE_KEY_PARTS = ('password', 'token', 'secret', 'credential', 'authorization')
ENDPOINT_MAX_LENGTH = 255
USER_AGENT_MAX_LENGTH = 255


def _sanitize(value: Any) -> Any:
    """Drop any key that looks like a password, token or credential, at any depth."""
    if isinstance(value, dict):
        return {
            key: _sanitize(item)
            for key, item in value.items()
            if not any(part in str(key).lower() for part in SENSITIVE_KEY_PARTS)
        }
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value


def valid_ip(raw: str | None) -> str | None:
    """The address in canonical form, or None if it is not an IP address."""
    if not raw:
        return None
    try:
        return str(ipaddress.ip_address(raw.strip()))
    except ValueError:
        return None


def log_security_event(
    *,
    user: Any | None,
    action: str,
    endpoint: str | None,
    method: str | None,
    ip_address: str | None,
    user_agent: str | None,
    status_code: int | None,
    request_id: str | None,
    details: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        user=user,
        action=action,
        endpoint=endpoint[:ENDPOINT_MAX_LENGTH] if endpoint else None,
        method=method,
        ip_address=valid_ip(ip_address),
        user_agent=user_agent[:USER_AGENT_MAX_LENGTH] if user_agent else None,
        status_code=status_code,
        request_id=request_id or get_request_id(),
        details=_sanitize(details or {}),
    )
