"""
Module: notifications.consumers
Description: WebSocket consumer for the notification bell.

The handshake carries a one-time ticket rather than a JWT: see
accounts.services.ws_ticket_service for why. An unredeemable ticket closes the
socket with 4401 before the client joins any group.
"""

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from accounts.services.ws_ticket_service import redeem_ticket

from .services import GROUP


@database_sync_to_async
def _redeem(ticket):
    return redeem_ticket(ticket=ticket)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        params = dict(
            pair.split('=', 1)
            for pair in self.scope.get('query_string', b'').decode().split('&')
            if '=' in pair
        )
        user_id = await _redeem(params.get('ticket'))
        if user_id is None:
            await self.close(code=4401)
            return

        self.group_name = GROUP.format(user_id=user_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        await self.send_json(event['data'])
