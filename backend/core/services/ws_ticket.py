"""
Module: core.services.ws_ticket
Description: Single-use tickets for the WebSocket handshake.

A browser cannot set an Authorization header on a WebSocket, and a JWT in the query
string leaks into proxy and server logs. The client exchanges its JWT for a short-lived
random ticket over HTTPS, then presents the ticket once during the handshake.

Uses the Django cache API rather than a raw Redis connection so the in-process
fallback (USE_REDIS=False) and the test suite work too. Single use is enforced by
cache.delete(): when two handshakes race on one ticket, only one delete reports that
it removed the key.
"""

import json
import uuid
from typing import Any

from django.conf import settings
from django.core.cache import cache

TICKET_KEY = 'ws_ticket:{ticket}'


def create_ws_ticket(*, user_id: int, role: str) -> str:
    ticket = uuid.uuid4().hex
    payload = json.dumps({'user_id': user_id, 'role': role.upper()})
    cache.set(TICKET_KEY.format(ticket=ticket), payload, timeout=settings.WS_TICKET_TTL)
    return ticket


def verify_and_consume_ws_ticket(ticket: str) -> dict[str, Any] | None:
    """Return {user_id, role} and burn the ticket. None if unknown, expired or already used."""
    if not ticket or not isinstance(ticket, str):
        return None

    key = TICKET_KEY.format(ticket=ticket)
    raw_payload = cache.get(key)
    if raw_payload is None or not cache.delete(key):
        return None

    if isinstance(raw_payload, bytes):
        raw_payload = raw_payload.decode('utf-8')
    try:
        return json.loads(raw_payload)
    except (json.JSONDecodeError, TypeError):
        return None
