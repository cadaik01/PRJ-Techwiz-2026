"""
Module: marketlink_core.exceptions
Description: Business exceptions mapped to the error catalog. `message` is the
             Vietnamese text shown to end users; `code` and `errors` are English.
"""

from rest_framework.exceptions import APIException, AuthenticationFailed


class TokenBlacklistedError(AuthenticationFailed):
    status_code = 401
    default_code = 'TOKEN_BLACKLISTED'

    def __init__(
        self,
        message: str = 'The token has been revoked or logged out',
        code: str = 'TOKEN_BLACKLISTED',
        errors: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}


class BusinessValidationError(APIException):
    status_code = 400
    default_code = 'VALIDATION_ERROR'

    def __init__(self, message: str, code: str = 'VALIDATION_ERROR', errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}


class ForbiddenActionError(APIException):
    status_code = 403
    default_code = 'ACTION_NOT_PERMITTED_FOR_ROLE'

    def __init__(self, message: str, code: str = 'ACTION_NOT_PERMITTED_FOR_ROLE', errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}


class ConflictError(APIException):
    status_code = 409
    default_code = 'RESOURCE_CONFLICT'

    def __init__(self, message: str, code: str = 'RESOURCE_CONFLICT', errors: dict | None = None):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}


class UnprocessableEntityError(APIException):
    """`data` goes into the envelope's `data`, e.g. the open orders behind a RESOURCE_IN_USE."""

    status_code = 422
    default_code = 'FAILED_PRECONDITION'

    def __init__(
        self, message: str, code: str = 'FAILED_PRECONDITION', errors: dict | None = None, data: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}
        self.data = data


class PreconditionRequiredError(APIException):
    status_code = 428
    default_code = 'PRECONDITION_REQUIRED'

    def __init__(
        self,
        message: str = 'A precondition header is required',
        code: str = 'PRECONDITION_REQUIRED',
        errors: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.errors = errors or {}


BUSINESS_EXCEPTIONS = (
    TokenBlacklistedError,
    BusinessValidationError,
    ForbiddenActionError,
    ConflictError,
    UnprocessableEntityError,
    PreconditionRequiredError,
)
