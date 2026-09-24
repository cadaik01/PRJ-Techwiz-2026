"""
Module: manager.common.audit
Description: Audit an admin action outside its business transaction (MarketLink
             "4 lưu ý" §1): the row is written after the service returns or fails, so a
             rollback never erases it.
"""

from collections.abc import Callable
from typing import TypeVar

from rest_framework.exceptions import APIException

from marketlink_core.utils import audit_request

T = TypeVar('T')


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
