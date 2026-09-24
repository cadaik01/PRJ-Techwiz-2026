from typing import Any, Callable, TypeVar

from django.db import OperationalError

from marketlink_core.exceptions import ConflictError, ErrorCode

MYSQL_DEADLOCK = 1213
MYSQL_LOCK_WAIT_TIMEOUT = 1205

T = TypeVar("T")


def run_with_deadlock_retry(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Run fn and retry once on a MySQL deadlock (1213).

    A lock wait timeout (1205) already waited innodb_lock_wait_timeout, so it becomes
    409 CONFLICT_RETRY straight away instead of a 500.

    fn must open its own transaction.atomic(); the retry has to sit outside that block
    because InnoDB has already rolled the deadlocked transaction back.
    """
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
