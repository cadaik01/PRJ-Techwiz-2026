"""Tests for the notifications app."""

import pytest
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.urls import reverse

from core.services.ws_ticket import create_ws_ticket
from notifications.models import NotificationLevel
from notifications.routing import websocket_urlpatterns
from notifications.services import push_notification

application = URLRouter(websocket_urlpatterns)


@pytest.mark.django_db
def test_push_persists_and_lists_in_paginated_envelope(auth_client, user):
    push_notification(user_id=user.pk, title='Task assigned', message='Task #1', target_url='/tasks/1')
    response = auth_client.get(reverse('notification-list'))

    assert response.status_code == 200
    assert response.data['success'] is True
    assert response.data['data']['count'] == 1
    row = response.data['data']['results'][0]
    assert row['title'] == 'Task assigned'
    assert row['level'] == NotificationLevel.INFO == 'INFO'
    assert row['target_url'] == '/tasks/1'


@pytest.mark.django_db
def test_cannot_read_another_users_notification(auth_client, admin_user):
    other = push_notification(user_id=admin_user.pk, title='secret')
    response = auth_client.patch(reverse('notification-read', args=[other.pk]))

    # Scoped by recipient, so someone else's id is indistinguishable from a
    # missing row - no information about its existence leaks.
    assert response.status_code == 404
    assert response.data['code'] == 'NOT_FOUND'
    other.refresh_from_db()
    assert other.is_read is False


@pytest.mark.django_db
def test_mark_one_read(auth_client, user):
    mine = push_notification(user_id=user.pk, title='mine')
    assert auth_client.patch(reverse('notification-read', args=[mine.pk])).status_code == 200
    mine.refresh_from_db()
    assert mine.is_read is True


@pytest.mark.django_db
def test_list_excludes_other_users_rows(auth_client, user, admin_user):
    push_notification(user_id=user.pk, title='mine')
    push_notification(user_id=admin_user.pk, title='theirs')

    results = auth_client.get(reverse('notification-list')).data['data']['results']
    assert [row['title'] for row in results] == ['mine']


@pytest.mark.django_db
def test_read_all_marks_only_the_callers_rows(auth_client, user, admin_user):
    push_notification(user_id=user.pk, title='mine')
    theirs = push_notification(user_id=admin_user.pk, title='theirs')

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

        await database_sync_to_async(push_notification)(
            user_id=user.pk, title='Order shipped', level=NotificationLevel.SUCCESS,
        )
        frame = await socket.receive_json_from()
        assert frame['event'] == 'NEW_NOTIFICATION'
        assert frame['data']['title'] == 'Order shipped'
        assert frame['data']['level'] == 'SUCCESS'
        assert frame['data']['is_read'] is False
        await socket.disconnect()

        # The ticket was burnt by the first handshake: replaying the URL is refused.
        replay = WebsocketCommunicator(application, f'/ws/notifications/?ticket={ticket}')
        connected, code = await replay.connect()
        assert not connected
        assert code == 4401

    async_to_sync(scenario)()
