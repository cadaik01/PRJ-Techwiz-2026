DEFAULT_MESSAGES = {
    "OK": "Success",
    "VALIDATION_ERROR": "Invalid input data",
    "NOT_AUTHENTICATED": "Please log in to continue",
    "PERMISSION_DENIED": "You do not have permission to perform this action",
    "NOT_FOUND": "Resource not found",
    "THROTTLED": "Too many requests, please try again later",
    "FAILED_PRECONDITION": "This action cannot be performed",
    "INTERNAL_SERVER_ERROR": "An unexpected error occurred, please try again later",
    "HEALTH_DEGRADED": "Database is unreachable",
}


def default_message(code: str) -> str:
    return DEFAULT_MESSAGES.get(code, DEFAULT_MESSAGES["FAILED_PRECONDITION"])
