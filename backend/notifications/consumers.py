import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from marketlink_core.services.ws_ticket import verify_and_consume_ws_ticket

logger = logging.getLogger("marketlink")

CLOSE_CODE_UNAUTHORIZED = 4401


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id: int | None = None
        self.group_name: str | None = None

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        ticket = query_params.get("ticket", [None])[0]

        if not ticket:
            # Per A-006 note 2: Accept first then close with 4401 to prevent browser HTTP 403 / 1006 error
            await self.accept()
            await self.close(code=CLOSE_CODE_UNAUTHORIZED)
            return

        payload = await sync_to_async(verify_and_consume_ws_ticket)(ticket=ticket)
        if not payload or "user_id" not in payload:
            await self.accept()
            await self.close(code=CLOSE_CODE_UNAUTHORIZED)
            return

        self.user_id = payload["user_id"]
        self.group_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name and self.channel_layer:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        payload = {
            "event": "NEW_NOTIFICATION",
            "data": event.get("data", {}),
        }
        await self.send_json(payload)
