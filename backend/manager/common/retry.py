"""
Module: manager.common.retry
Description: One retry on MySQL deadlock (1213), outside the transaction, then 409
             CONFLICT_RETRY (Pass 4A §5.2, Pass 4B §2.5).
"""

from collections.abc import Callable
from typing import TypeVar

from django.db import OperationalError

from marketlink_core.exceptions import ConflictError

MYSQL_DEADLOCK = 1213
T = TypeVar('T')


def run_with_deadlock_retry(operation: Callable[[], T]) -> T:
    """`operation` must open its own transaction.atomic(), so each attempt starts clean."""
    for attempt in (1, 2):
        try:
            return operation()
        except OperationalError as exc:
            if not exc.args or exc.args[0] != MYSQL_DEADLOCK:
                raise
            if attempt == 2:
                raise ConflictError('Hệ thống đang bận, vui lòng thử lại', code='CONFLICT_RETRY') from exc
    raise AssertionError('unreachable')
