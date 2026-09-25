import json
from decimal import Decimal

from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from accounts.models import CustomUser, CustomerProfile, Role, RoleCode
from marketlink_core.asgi import application
from marketlink_core.services.ws_ticket import create_ws_ticket, verify_and_consume_ws_ticket
from notifications.models import NotificationType
from notifications.services import notify


class WebSocketTicketTestCase(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        customer_role, _ = Role.objects.get_or_create(
            code=RoleCode.CUSTOMER, defaults={"name": "Customer"}
        )
        self.user = CustomUser.objects.create(
            email="ws_user@marketlink.local",
            role=customer_role,
        )
        CustomerProfile.objects.create(
            user=self.user,
            full_name="WS User",
            phone="0911888999",
            address="WS Lane",
        )

    def test_create_and_consume_ticket(self):
        ticket = create_ws_ticket(user_id=self.user.pk, role=RoleCode.CUSTOMER)
        self.assertTrue(len(ticket) > 20)

        # 1. First consumption succeeds
        payload = verify_and_consume_ws_ticket(ticket=ticket)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user_id"], self.user.pk)
        self.assertEqual(payload["role"], RoleCode.CUSTOMER)

        # 2. Second consumption fails (single-use guarantee, CT-16)
        second_attempt = verify_and_consume_ws_ticket(ticket=ticket)
        self.assertIsNone(second_attempt)

    def test_ws_ticket_endpoint_au08(self):
        # Unauthenticated -> 401
        res = self.client.post("/api/auth/ws-ticket/")
        self.assertEqual(res.status_code, 401)

        # Authenticated -> 200
        self.client.force_authenticate(user=self.user)
        res_auth = self.client.post("/api/auth/ws-ticket/")
        self.assertEqual(res_auth.status_code, 200)
        data = res_auth.data["data"]
        self.assertIn("ticket", data)
        self.assertEqual(data["expires_in"], 30)

        # Consume ticket
        payload = verify_and_consume_ws_ticket(ticket=data["ticket"])
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user_id"], self.user.pk)

    async def test_websocket_consumer_invalid_ticket_closes_4401(self):
        # Connect with invalid ticket
        communicator = WebsocketCommunicator(application, "/ws/notifications/?ticket=invalid-uuid-123")
        connected, close_code = await communicator.connect()
        # Per note 2 / CT-16: connection accepts then closes with code 4401
        self.assertTrue(connected)
        message = await communicator.receive_output()
        self.assertEqual(message["type"], "websocket.close")
        self.assertEqual(message["code"], 4401)
        await communicator.disconnect()

    async def test_websocket_consumer_valid_ticket_receives_event(self):
        ticket = create_ws_ticket(user_id=self.user.pk, role=RoleCode.CUSTOMER)
        communicator = WebsocketCommunicator(application, f"/ws/notifications/?ticket={ticket}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Dispatch notification to user
        notification = await sync_to_async(notify)(
            recipient=self.user,
            event_type=NotificationType.ACCOUNT_STATUS_CHANGED,
            context={"status_label": "Active", "reason": "Welcome!"},
        )

        response = await communicator.receive_json_from()
        self.assertEqual(response["event"], "NEW_NOTIFICATION")
        self.assertEqual(response["data"]["id"], notification.pk)
        self.assertEqual(response["data"]["type"], NotificationType.ACCOUNT_STATUS_CHANGED)

        await communicator.disconnect()
