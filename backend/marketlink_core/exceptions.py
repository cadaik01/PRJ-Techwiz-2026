import logging

from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.views import set_rollback

from marketlink_core.messages import default_message
from marketlink_core.responses import error_body

logger = logging.getLogger(__name__)

# Frozen codes from Pass 4B §2.5 for errors raised by DRF itself.
STATUS_TO_CODE = {
    400: "VALIDATION_ERROR",
    401: "NOT_AUTHENTICATED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    429: "THROTTLED",
}


class DomainError(exceptions.APIException):
    """Base for business errors; subclasses set `status_code` and a frozen `code`."""

    status_code = 422
    code = "FAILED_PRECONDITION"

    def __init__(self, message: str | None = None, errors: dict | None = None):
        self.message = message or default_message(self.code)
        self.errors = errors or {}
        super().__init__(detail=self.message, code=self.code)


def _flatten_errors(detail, prefix: str = "") -> dict:
    if isinstance(detail, dict):
        flat = {}
        for key, value in detail.items():
            flat.update(_flatten_errors(value, f"{prefix}.{key}" if prefix else str(key)))
        return flat
    if isinstance(detail, list):
        if all(not isinstance(item, (dict, list)) for item in detail):
            return {prefix or "non_field_errors": [str(item) for item in detail]} if detail else {}
        flat = {}
        for index, item in enumerate(detail):
            flat.update(_flatten_errors(item, f"{prefix}.{index}" if prefix else str(index)))
        return flat
    return {prefix or "non_field_errors": [str(detail)]}


def envelope_exception_handler(exc, context):
    if isinstance(exc, DomainError):
        set_rollback()
        return Response(error_body(exc.code, exc.message, exc.errors), status=exc.status_code)

    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled exception", exc_info=exc)
        set_rollback()
        code = "INTERNAL_SERVER_ERROR"
        return Response(error_body(code, default_message(code)), status=500)

    code = STATUS_TO_CODE.get(response.status_code, "VALIDATION_ERROR")
    errors = _flatten_errors(response.data) if isinstance(exc, exceptions.ValidationError) else {}
    response.data = error_body(code, default_message(code), errors)
    return response
