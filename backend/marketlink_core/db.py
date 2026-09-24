from django.db import OperationalError

from marketlink_core.exceptions import ConflictRetryError

MYSQL_LOCK_WAIT_TIMEOUT = 1205
MYSQL_DEADLOCK = 1213


def _mysql_code(exc: OperationalError):
    return exc.args[0] if exc.args else None


def run_with_deadlock_retry(fn, *args, **kwargs):
    """`fn` must open its own transaction.atomic() so a retry starts a fresh transaction.

    Deadlocks are retried once (Implementation Notes §3). A lock wait timeout already waited
    innodb_lock_wait_timeout, so it is reported as 409 CONFLICT_RETRY straight away.
    """
    for attempt in range(2):
        try:
            return fn(*args, **kwargs)
        except OperationalError as exc:
            code = _mysql_code(exc)
            if code == MYSQL_LOCK_WAIT_TIMEOUT or (code == MYSQL_DEADLOCK and attempt == 1):
                raise ConflictRetryError() from exc
            if code != MYSQL_DEADLOCK:
                raise
