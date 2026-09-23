"""
Module: notifications.consumers
Description: WebSocket consumer for the notification bell.

The handshake carries a one-time ticket rather than a JWT (see
core.services.ws_ticket). An unusable ticket, or an account that is no longer
active, closes the socket with 4401 before it joins any group.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from core.services.ws_ticket import verify_and_consume_ws_ticket
from notifications.services import ROLE_GROUP, USER_GROUP

CLOSE_UNAUTHORIZED = 4401


@database_sync_to_async
def _authenticate(ticket):
    payload = verify_and_consume_ws_ticket(ticket)
    if payload is None:
        return None
    return get_user_model().objects.select_related('role').filter(
        pk=payload.get('user_id'), is_active=True,
    ).first()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        query = parse_qs(self.scope.get('query_string', b'').decode())
        user = await _authenticate((query.get('ticket') or [None])[0])
        if user is None:
            await self.close(code=CLOSE_UNAUTHORIZED)
            return

        self.scope['user'] = user
        self.groups_joined = [
            USER_GROUP.format(user_id=user.pk),
            ROLE_GROUP.format(role=user.role.code),
        ]
        for group in self.groups_joined:
            await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        for group in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def notify(self, event):
        await self.send_json({'event': event['event'], 'data': event['data']})
