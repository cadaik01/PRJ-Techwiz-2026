from marketlink_core.exceptions import DomainError


class SlotNotAvailableError(DomainError):
    status_code = 422
    code = "SLOT_NOT_AVAILABLE"
    message = "The selected pickup slot is not available"


class CutoffPassedError(DomainError):
    status_code = 422
    code = "CUTOFF_PASSED"
    message = "The order deadline for this pickup slot has passed"


class ProductNotAvailableError(DomainError):
    status_code = 422
    code = "PRODUCT_NOT_AVAILABLE"
    message = "Some products are no longer available"


class InsufficientStockError(DomainError):
    status_code = 400
    code = "INSUFFICIENT_STOCK"
    message = "Some products do not have enough stock"


class OpenOrderLimitExceededError(DomainError):
    status_code = 422
    code = "OPEN_ORDER_LIMIT_EXCEEDED"
    message = "You have reached the limit of open orders"


class IdempotencyInProgressError(DomainError):
    status_code = 409
    code = "IDEMPOTENCY_IN_PROGRESS"
    message = "This order is already being processed"


class IdempotencyKeyReusedError(DomainError):
    status_code = 422
    code = "IDEMPOTENCY_KEY_REUSED"
    message = "This Idempotency-Key was already used for a different request"
