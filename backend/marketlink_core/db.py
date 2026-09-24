from django.db import OperationalError

from marketlink_core.exceptions import ConflictRetryError

MYSQL_DEADLOCK = 1213


def run_with_deadlock_retry(fn, *args, **kwargs):
    """`fn` must open its own transaction.atomic() so a retry starts a fresh transaction."""
    for attempt in range(2):
        try:
            return fn(*args, **kwargs)
        except OperationalError as exc:
            if not (exc.args and exc.args[0] == MYSQL_DEADLOCK):
                raise
            if attempt == 1:
                raise ConflictRetryError() from exc
