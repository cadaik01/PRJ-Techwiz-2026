import uuid

from rest_framework import serializers

from marketlink_core.exceptions import PreconditionRequiredError


def require_idempotency_key(request) -> str:
    raw = request.headers.get("Idempotency-Key")
    if not raw:
        raise PreconditionRequiredError(errors={"idempotency_key": ["Idempotency-Key header is required"]})
    try:
        return str(uuid.UUID(raw))
    except ValueError as exc:
        raise serializers.ValidationError({"idempotency_key": ["Idempotency-Key must be a UUID"]}) from exc
