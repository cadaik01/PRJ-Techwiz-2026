"""Shared manager helpers."""

import pytest
from django.db import OperationalError

from core.exceptions import ConflictError
from manager.common.retry import run_with_deadlock_retry


def flaky(failures):
    calls = []

    def operation():
        calls.append(1)
        if len(calls) <= failures:
            raise OperationalError(1213, 'Deadlock found when trying to get lock')
        return 'done'
    return operation, calls


def test_one_deadlock_is_retried():
    operation, calls = flaky(1)
    assert (run_with_deadlock_retry(operation), len(calls)) == ('done', 2)


def test_second_deadlock_is_conflict_retry():
    operation, calls = flaky(2)
    with pytest.raises(ConflictError) as error:
        run_with_deadlock_retry(operation)
    assert (error.value.code, len(calls)) == ('CONFLICT_RETRY', 2)


def test_other_database_errors_are_not_retried():
    calls = []

    def operation():
        calls.append(1)
        raise OperationalError(2006, 'MySQL server has gone away')

    with pytest.raises(OperationalError):
        run_with_deadlock_retry(operation)
    assert len(calls) == 1
