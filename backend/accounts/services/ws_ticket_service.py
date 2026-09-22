"""
Module: accounts.services.ws_ticket_service
Description: One-time tickets for the WebSocket handshake.

A browser cannot set an Authorization header on a WebSocket, and putting the
access token in the query string leaks it into proxy and server logs. Instead the
client asks this service for a short-lived random ticket over authenticated HTTP,
then presents it once during the handshake. Redeeming a ticket deletes it, so a
leaked URL cannot be replayed.
"""

import secrets

from django.conf import settings
from django.core.cache import cache

TICKET_KEY = 'ws_ticket:{ticket}'


def issue_ticket(*, user):
    """Create a single-use handshake ticket for the given user."""
    ticket = secrets.token_urlsafe(32)
    cache.set(TICKET_KEY.format(ticket=ticket), user.pk, timeout=settings.WS_TICKET_TTL)
    return ticket


def redeem_ticket(*, ticket):
    """Return the user id behind a ticket and burn it. None if unknown or expired."""
    if not ticket:
        return None
    key = TICKET_KEY.format(ticket=ticket)
    user_id = cache.get(key)
    if user_id is not None:
        cache.delete(key)
    return user_id
