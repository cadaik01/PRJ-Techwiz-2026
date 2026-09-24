"""Tests for the notifications app."""

import pytest
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.urls import reverse

from core.services.ws_ticket import create_ws_ticket
from notifications.models import NotificationType
from notifications.routing import websocket_urlpatterns
from notifications.services import push_notification

application = URLRouter(websocket_urlpatterns)


def _push(user_id, title, type=NotificationType.ORDER_PLACED):
    return push_notification(user_id=user_id, type=type, title=title, message=title)


@pytest.mark.django_db
def test_push_persists_and_lists_in_paginated_envelope(auth_client, user):
    push_notification(
        user_id=user.pk, type=NotificationType.ORDER_ACCEPTED, title='Đơn đã được xác nhận',
        message='Đơn #1', target_url='/orders/1',
    )
    response = auth_client.get(reverse('notification-list'))

    assert response.status_code == 200
    assert response.data['success'] is True
    assert response.data['data']['count'] == 1
    row = response.data['data']['results'][0]
    assert (row['type'], row['title']) == ('ORDER_ACCEPTED', 'Đơn đã được xác nhận')
    assert (row['target_url'], row['is_read'], row['read_at']) == ('/orders/1', False, None)


@pytest.mark.django_db
def test_cannot_read_another_users_notification(auth_client, admin_user):
    other = _push(admin_user.pk, 'secret')
    response = auth_client.patch(reverse('notification-read', args=[other.pk]))

    # Scoped by recipient, so someone else's id is indistinguishable from a
    # missing row - no information about its existence leaks.
    assert response.status_code == 404
    assert response.data['code'] == 'NOT_FOUND'
    other.refresh_from_db()
    assert other.is_read is False


@pytest.mark.django_db
def test_mark_one_read(auth_client, user):
    mine = _push(user.pk, 'mine')
    assert auth_client.patch(reverse('notification-read', args=[mine.pk])).status_code == 200
    mine.refresh_from_db()
    assert mine.is_read is True
    assert mine.read_at is not None


@pytest.mark.django_db
def test_list_excludes_other_users_rows(auth_client, user, admin_user):
    _push(user.pk, 'mine')
    _push(admin_user.pk, 'theirs')

    results = auth_client.get(reverse('notification-list')).data['data']['results']
    assert [row['title'] for row in results] == ['mine']


@pytest.mark.django_db
def test_read_all_marks_only_the_callers_rows(auth_client, user, admin_user):
    _push(user.pk, 'mine')
    theirs = _push(admin_user.pk, 'theirs')

    response = auth_client.patch(reverse('notification-read-all'))
    assert response.data['data']['updated'] == 1

    theirs.refresh_from_db()
    assert theirs.is_read is False


@pytest.mark.django_db(transaction=True)
def test_websocket_ticket_handshake_and_event_contract(user):
    ticket = create_ws_ticket(user_id=user.pk, role=user.role.code)

    async def scenario():
        socket = WebsocketCommunicator(application, f'/ws/notifications/?ticket={ticket}')
        connected, _ = await socket.connect()
        assert connected

        await database_sync_to_async(_push)(user.pk, 'Đơn sẵn sàng nhận', NotificationType.ORDER_READY)
        frame = await socket.receive_json_from()
        assert frame['event'] == 'NEW_NOTIFICATION'
        assert frame['data']['title'] == 'Đơn sẵn sàng nhận'
        assert frame['data']['type'] == 'ORDER_READY'
        assert frame['data']['is_read'] is False
        await socket.disconnect()

        # CT-16: the first handshake burnt the ticket, so replaying the URL is accepted
        # and closed with 4401 (closing before accept would surface as 1006 in browsers).
        replay = WebsocketCommunicator(application, f'/ws/notifications/?ticket={ticket}')
        connected, _ = await replay.connect()
        assert connected
        assert await replay.receive_output() == {'type': 'websocket.close', 'code': 4401}

    async_to_sync(scenario)()


@pytest.mark.django_db(transaction=True)
def test_websocket_rejects_ticket_of_locked_account(user):
    ticket = create_ws_ticket(user_id=user.pk, role=user.role.code)
    user.is_active = False
    user.save(update_fields=['is_active'])

    async def scenario():
        socket = WebsocketCommunicator(application, f'/ws/notifications/?ticket={ticket}')
        await socket.connect()
        assert await socket.receive_output() == {'type': 'websocket.close', 'code': 4401}

    async_to_sync(scenario)()
