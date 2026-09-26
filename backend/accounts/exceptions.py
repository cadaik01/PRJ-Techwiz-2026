from marketlink_core.exceptions import AuthenticationError, BusinessValidationError, DomainError, ErrorCode


class EmailExistsError(BusinessValidationError):
    default_code = ErrorCode.EMAIL_EXISTS
    default_detail = "This email is already registered"


class InvalidCredentialsError(AuthenticationError):
    default_code = ErrorCode.INVALID_CREDENTIALS
    default_detail = "Incorrect email or password"


class AccountLockedError(DomainError):
    status_code = 403
    default_code = ErrorCode.ACCOUNT_LOCKED
    default_detail = "Your account has been locked"


class TokenInvalidError(AuthenticationError):
    default_code = ErrorCode.TOKEN_INVALID
    default_detail = "Your session has expired, please log in again"
