from typing import Any, Callable, TypeVar

from django.db import OperationalError

from marketlink_core.exceptions import ConflictError, ErrorCode

MYSQL_DEADLOCK = 1213
MYSQL_LOCK_WAIT_TIMEOUT = 1205

T = TypeVar("T")


# The retry sits outside fn's atomic block because InnoDB rolls back the whole deadlocked transaction.
# A lock wait timeout already waited innodb_lock_wait_timeout, so it becomes 409 straight away.
def run_with_deadlock_retry(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    for attempt in range(2):
        try:
            return fn(*args, **kwargs)
        except OperationalError as exc:
            errno = exc.args[0] if exc.args else None
            if errno == MYSQL_LOCK_WAIT_TIMEOUT:
                raise ConflictError(
                    "The system is busy. Please try again.", code=ErrorCode.CONFLICT_RETRY
                ) from exc
            if errno != MYSQL_DEADLOCK:
                raise
            if attempt == 1:
                raise ConflictError(
                    "The system is busy. Please try again.", code=ErrorCode.CONFLICT_RETRY
                ) from exc
    raise AssertionError("unreachable")
