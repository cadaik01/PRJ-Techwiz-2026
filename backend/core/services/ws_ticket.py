"""
Module: core.services.ws_ticket
Description: Single-use tickets for the WebSocket handshake (MarketLink D-010, AU-08).

A browser cannot set an Authorization header on a WebSocket, and a JWT in the query
string leaks into proxy and server logs. The client exchanges its JWT for a short-lived
random ticket over HTTPS, then presents the ticket once during the handshake.

Tickets live in Redis under ws_ticket:<uuid> and are redeemed with GETDEL, a single
atomic command: two handshakes racing on one ticket cannot both read it. The raw
Redis client is used on purpose - the django-redis cache API has no getdel.
"""

import json
import uuid
from typing import Any

import redis
import redis.asyncio as aioredis
from django.conf import settings

TICKET_KEY = 'ws_ticket:{ticket}'


def _sync_client() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _async_client() -> aioredis.Redis:
    # A fresh client per handshake: a pooled asyncio client is bound to the event
    # loop that created it, and handshakes are rare enough not to need pooling.
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def _decode(raw_payload: str | None) -> dict[str, Any] | None:
    if not raw_payload:
        return None
    try:
        return json.loads(raw_payload)
    except (json.JSONDecodeError, TypeError):
        return None


def create_ws_ticket(*, user_id: int, role: str) -> str:
    ticket = uuid.uuid4().hex
    payload = json.dumps({'user_id': user_id, 'role': role.upper()})
    _sync_client().set(TICKET_KEY.format(ticket=ticket), payload, ex=settings.WS_TICKET_TTL)
    return ticket


def verify_and_consume_ws_ticket(ticket: str | None) -> dict[str, Any] | None:
    """Return {user_id, role} and burn the ticket. None if unknown, expired or already used."""
    if not ticket or not isinstance(ticket, str):
        return None
    return _decode(_sync_client().getdel(TICKET_KEY.format(ticket=ticket)))


async def averify_and_consume_ws_ticket(ticket: str | None) -> dict[str, Any] | None:
    """Async twin for the consumer, so the handshake does not block the event loop."""
    if not ticket or not isinstance(ticket, str):
        return None
    client = _async_client()
    try:
        raw_payload = await client.getdel(TICKET_KEY.format(ticket=ticket))
    finally:
        await client.aclose()
    return _decode(raw_payload)
