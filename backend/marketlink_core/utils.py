"""
Module: marketlink_core.utils
Description: The response envelope every endpoint returns, and the exception handler
             that renders every error in that same envelope.
"""

import logging
from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError, RestrictedError
from django.db.utils import DataError, IntegrityError, OperationalError
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.views import set_rollback

from marketlink_core.context import get_request_id
from marketlink_core.exceptions import BUSINESS_EXCEPTIONS

logger = logging.getLogger(__name__)

STATUS_CODES = {
    400: 'VALIDATION_ERROR',
    401: 'AUTHENTICATION_FAILED',
    403: 'ACTION_NOT_PERMITTED_FOR_ROLE',
    404: 'NOT_FOUND',
    409: 'RESOURCE_CONFLICT',
    422: 'FAILED_PRECONDITION',
    428: 'PRECONDITION_REQUIRED',
    429: 'RATE_LIMIT_EXCEEDED',
}

# User-facing text for errors raised by Django/DRF.
MESSAGES = {
    'VALIDATION_ERROR': 'Invalid data',
    'AUTHENTICATION_FAILED': 'Your session is invalid or has expired',
    'ACTION_NOT_PERMITTED_FOR_ROLE': 'You are not allowed to perform this action',
    'NOT_FOUND': 'Not found',
    'RESOURCE_CONFLICT': 'The data is in use or already exists',
    'CONCURRENCY_DEADLOCK': 'The system is busy, please try again',
    'RATE_LIMIT_EXCEEDED': 'Too many requests, please try again later',
    'INTERNAL_SERVER_ERROR': 'Something went wrong on our side. Please try again later.',
}
FALLBACK_MESSAGE = 'Invalid request'

MYSQL_DUPLICATE_ENTRY = 1062
MYSQL_ROW_IS_REFERENCED = 1451
MYSQL_NO_REFERENCED_ROW = 1452
MYSQL_DATA_TOO_LONG = 1406
MYSQL_DEADLOCK = 1213


def _default_code(status_code: int) -> str:
    if status_code >= 500:
        return 'INTERNAL_SERVER_ERROR'
    return STATUS_CODES.get(status_code, 'VALIDATION_ERROR')


def api_response(
    *,
    message: str,
    data: Any = None,
    status_code: int = 200,
    request: Any = None,
    code: str | None = None,
    errors: dict[str, list[str]] | None = None,
) -> Response:
    """Wrap a payload in the envelope. `success` and a missing `code` follow status_code."""
    request_id = getattr(request, 'id', None) or get_request_id()
    body = {
        'success': status_code < 400,
        'message': message,
        'request_id': request_id,
        'data': data if data is not None else {},
        'errors': errors or {},
    }
    if status_code >= 400:
        body = {
            'success': False,
            'message': message,
            'code': code or _default_code(status_code),
            'request_id': request_id,
            'data': body['data'],
            'errors': body['errors'],
        }
    return Response(body, status=status_code)


def _as_errors(detail: Any) -> dict[str, list[str]]:
    """Normalise a DRF error detail into {field: [message, ...]}."""
    if isinstance(detail, dict):
        return {
            key: [str(item) for item in value] if isinstance(value, list) else [str(value)]
            for key, value in detail.items()
        }
    if isinstance(detail, list):
        return {'non_field_errors': [str(item) for item in detail]}
    return {'detail': [str(detail)]}


def _mysql_errno(exc: Exception) -> int | None:
    args = getattr(exc, 'args', ())
    return args[0] if args and isinstance(args[0], int) else None


def _translate_django_exception(exc: Exception) -> tuple[int, str, dict] | None:
    """Map database and Django core exceptions to (status, code, errors)."""
    if isinstance(exc, (ProtectedError, RestrictedError)):
        return 409, 'RESOURCE_CONFLICT', {}
    if isinstance(exc, IntegrityError) and _mysql_errno(exc) in (
        MYSQL_DUPLICATE_ENTRY, MYSQL_ROW_IS_REFERENCED, MYSQL_NO_REFERENCED_ROW,
    ):
        return 409, 'RESOURCE_CONFLICT', {}
    if isinstance(exc, DataError) and _mysql_errno(exc) == MYSQL_DATA_TOO_LONG:
        return 400, 'VALIDATION_ERROR', {}
    if isinstance(exc, OperationalError) and _mysql_errno(exc) == MYSQL_DEADLOCK:
        return 409, 'CONCURRENCY_DEADLOCK', {}
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'error_dict'):
            return 400, 'VALIDATION_ERROR', {k: list(v) for k, v in exc.message_dict.items()}
        return 400, 'VALIDATION_ERROR', {'non_field_errors': list(exc.messages)}
    if isinstance(exc, DjangoPermissionDenied):
        return 403, 'ACTION_NOT_PERMITTED_FOR_ROLE', {}
    return None


def audit_request(
    request: Any,
    *,
    action: str,
    status_code: int,
    user: Any | None = None,
    details: dict | None = None,
) -> None:
    """Write a security event for this HTTP request to audit_logs.

    Call it outside any business transaction. A failed audit write is logged but
    never turns the response into a 500.
    """
    from system.services import log_security_event

    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    try:
        log_security_event(
            user=user,
            action=action,
            endpoint=request.path,
            method=request.method,
            ip_address=forwarded.split(',')[0] if forwarded else request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            status_code=status_code,
            request_id=getattr(request, 'id', None) or get_request_id(),
            details=details,
        )
    except Exception:
        logger.exception('Failed to write %s audit log', action)


def _log_forbidden(request: Any, code: str) -> None:
    if request is None:
        return
    user = getattr(request, 'user', None)
    audit_request(
        request,
        action='ACCESS_DENIED',
        status_code=403,
        user=user if getattr(user, 'is_authenticated', False) else None,
        details={'method': request.method, 'code': code},
    )


def custom_exception_handler(exc: Exception, context: dict) -> Response:
    """Render every exception in the envelope, with a code from the error catalog."""
    request = context.get('request')

    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()

    translated = _translate_django_exception(exc)
    if translated is not None:
        status_code, code, errors = translated
        if status_code == 403:
            _log_forbidden(request, code)
        return api_response(
            message=MESSAGES.get(code, FALLBACK_MESSAGE),
            status_code=status_code,
            request=request,
            code=code,
            errors=errors,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception('Unhandled exception', exc_info=exc)
        set_rollback()
        return api_response(
            message=MESSAGES['INTERNAL_SERVER_ERROR'],
            status_code=500,
            request=request,
            code='INTERNAL_SERVER_ERROR',
        )

    if isinstance(exc, BUSINESS_EXCEPTIONS):
        code = getattr(exc, 'code', exc.default_code)
        message = str(exc.detail)
        errors = exc.errors
    else:
        if isinstance(exc, (drf_exceptions.NotAuthenticated, drf_exceptions.AuthenticationFailed)):
            code = 'AUTHENTICATION_FAILED'
        elif isinstance(exc, drf_exceptions.PermissionDenied):
            code = 'ACTION_NOT_PERMITTED_FOR_ROLE'
        elif isinstance(exc, drf_exceptions.NotFound):
            code = 'NOT_FOUND'
        elif isinstance(exc, drf_exceptions.Throttled):
            code = 'RATE_LIMIT_EXCEEDED'
        elif isinstance(exc, drf_exceptions.ValidationError):
            code = 'VALIDATION_ERROR'
        elif isinstance(exc, drf_exceptions.APIException):
            code = str(exc.default_code).upper()
        else:
            code = _default_code(response.status_code)
        message = MESSAGES.get(code, FALLBACK_MESSAGE)
        errors = _as_errors(response.data)

    if response.status_code == 403:
        _log_forbidden(request, code)

    wrapped = api_response(
        message=message,
        status_code=response.status_code,
        request=request,
        code=code,
        errors=errors,
    )
    # Keep headers DRF set, e.g. WWW-Authenticate on 401 and Retry-After on 429.
    for header, value in response.items():
        wrapped[header] = value
    return wrapped
