"""
Module: notifications.consumers
Description: WebSocket consumer for the notification bell (MarketLink D-010, Pass 4B §4.9).

The handshake carries a one-time ticket rather than a JWT (see core.services.ws_ticket).
An unusable ticket, or an account that is no longer active, is accepted and then closed
with 4401: closing before accept() makes Channels reject the handshake with HTTP 403,
and the browser only sees code 1006 (CT-16). The ticket is already gone after GETDEL,
so accepting first opens nothing.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from core.services.ws_ticket import averify_and_consume_ws_ticket
from notifications.services import USER_GROUP

CLOSE_UNAUTHORIZED = 4401


@database_sync_to_async
def _active_user_exists(user_id):
    return get_user_model().objects.filter(pk=user_id, is_active=True).exists()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        query = parse_qs(self.scope.get('query_string', b'').decode())
        payload = await averify_and_consume_ws_ticket((query.get('ticket') or [None])[0])

        if payload is None or not await _active_user_exists(payload.get('user_id')):
            await self.accept()
            await self.close(code=CLOSE_UNAUTHORIZED)
            return

        self.group_name = USER_GROUP.format(user_id=payload['user_id'])
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        await self.send_json({'event': event['event'], 'data': event['data']})
