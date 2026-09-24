from marketlink_core.exceptions import DomainError


class EmailExistsError(DomainError):
    status_code = 400
    code = "EMAIL_EXISTS"
    message = "This email is already registered"


class InvalidCredentialsError(DomainError):
    status_code = 401
    code = "INVALID_CREDENTIALS"
    message = "Incorrect email or password"


class AccountLockedError(DomainError):
    status_code = 403
    code = "ACCOUNT_LOCKED"
    message = "Your account has been locked"
