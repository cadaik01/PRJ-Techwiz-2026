import pytest
from django.core.cache import caches


def _clear_all_caches():
    for alias in caches:
        caches[alias].clear()


@pytest.fixture(autouse=True)
def _clear_caches():
    # Throttle counters live in "default"; token revocation lives in "blacklist".
    _clear_all_caches()
    yield
    _clear_all_caches()
