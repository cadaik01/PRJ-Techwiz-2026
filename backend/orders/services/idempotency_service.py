import hashlib
import json
from dataclasses import dataclass

from django.core.cache import cache

from orders.exceptions import IdempotencyInProgressError, IdempotencyKeyReusedError

# Pass 4B §5.1 step 1. Needs a shared cache (Redis, USE_REDIS=True) when running more than one worker.
PROCESSING_TTL_SECONDS = 60
RESULT_TTL_SECONDS = 24 * 60 * 60


@dataclass(frozen=True)
class IdempotentResult:
    status: int
    body: dict
    replayed: bool


def _cache_key(user_id, key: str) -> str:
    return f"idem:{user_id}:{key}"


def fingerprint(payload) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def _begin(*, user_id, key: str, request_hash: str) -> dict | None:
    """Claims the key (returns None) or returns the finished entry to replay."""
    cache_key = _cache_key(user_id, key)
    if cache.add(cache_key, {"state": "processing", "hash": request_hash}, timeout=PROCESSING_TTL_SECONDS):
        return None
    entry = cache.get(cache_key)
    if entry is None or entry["state"] == "processing":
        if entry is not None and entry["hash"] != request_hash:
            raise IdempotencyKeyReusedError()
        raise IdempotencyInProgressError()
    if entry["hash"] != request_hash:
        raise IdempotencyKeyReusedError()
    return entry


def run_idempotent(*, user_id, key: str, payload, action) -> IdempotentResult:
    request_hash = fingerprint(payload)
    stored = _begin(user_id=user_id, key=key, request_hash=request_hash)
    if stored is not None:
        return IdempotentResult(status=stored["status"], body=stored["body"], replayed=True)
    try:
        status, body = action()
    except BaseException:
        cache.delete(_cache_key(user_id, key))
        raise
    cache.set(
        _cache_key(user_id, key),
        {"state": "done", "hash": request_hash, "status": status, "body": body},
        timeout=RESULT_TTL_SECONDS,
    )
    return IdempotentResult(status=status, body=body, replayed=False)
