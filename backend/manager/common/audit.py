"""
Module: manager.common.audit
Description: Audit an admin action outside its business transaction (MarketLink
             Implementation Notes §1): the row is written after the service returns or fails, so a
             rollback never erases it.
"""

import logging
from collections.abc import Callable
from typing import Any, TypeVar

from rest_framework.exceptions import APIException

from system.services import log_request_event

logger = logging.getLogger(__name__)

T = TypeVar('T')


def audit_request(
    request: Any,
    *,
    action: str,
    status_code: int,
    user: Any | None = None,
    details: dict | None = None,
) -> None:
    """Write a security event for this HTTP request; a failed write never becomes a 500."""
    try:
        log_request_event(request, action=action, status_code=status_code, user=user, details=details)
    except Exception:
        logger.exception('Failed to write %s audit log', action)


def audited(request, *, action: str, details: dict, operation: Callable[[], T], result_details=None) -> T:
    """Run `operation`; log `action` with 200 or with the error's status, then re-raise."""
    try:
        result = operation()
    except APIException as exc:
        audit_request(request, action=action, status_code=exc.status_code, user=request.user,
                      details={**details, 'error': getattr(exc, 'code', exc.default_code)})
        raise
    extra = result_details(result) if result_details else {}
    audit_request(request, action=action, status_code=200, user=request.user, details={**details, **extra})
    return result
