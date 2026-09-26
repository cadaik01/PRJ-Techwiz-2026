import json
import uuid
from typing import Any

from django.conf import settings
from django.core.cache import cache

TICKET_PREFIX = "ws_ticket:"
DEFAULT_TTL = getattr(settings, "WS_TICKET_TTL", 30)


def create_ws_ticket(*, user_id: int, role: str) -> str:
    ticket = str(uuid.uuid4())
    key = f"{TICKET_PREFIX}{ticket}"
    payload = {"user_id": user_id, "role": role}
    cache.set(key, payload, timeout=DEFAULT_TTL)
    return ticket


def verify_and_consume_ws_ticket(*, ticket: str) -> dict[str, Any] | None:
    if not ticket or not isinstance(ticket, str):
        return None

    key = f"{TICKET_PREFIX}{ticket.strip()}"
    raw = cache.get(key)
    if raw is None:
        return None

    deleted = cache.delete(key)
    if not deleted:
        return None

    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return None
    if isinstance(raw, dict):
        return raw
    return None

