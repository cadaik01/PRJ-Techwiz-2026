"""Tests for the authentication subsystem."""

import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_login_returns_token_pair(api_client, user):
    response = api_client.post(
        reverse('auth-login'),
        {'email': user.email, 'password': 'Test@1234'},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['success'] is True
    assert 'access' in response.data['data'] and 'refresh' in response.data['data']
    assert response.data['data']['user']['email'] == user.email


@pytest.mark.django_db
def test_login_rejects_wrong_password(api_client, user):
    response = api_client.post(
        reverse('auth-login'),
        {'email': user.email, 'password': 'wrong'},
        format='json',
    )
    assert response.status_code == 401
    assert response.data['success'] is False
    assert response.data['errors']['detail'] == ['Invalid credentials.']


@pytest.mark.django_db
def test_login_response_never_leaks_password(api_client, user):
    response = api_client.post(
        reverse('auth-login'),
        {'email': user.email, 'password': 'Test@1234'},
        format='json',
    )
    assert 'password' not in response.data['data']['user']


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get(reverse('auth-me'))
    assert response.status_code == 401
    # The exception handler must wrap DRF's own errors in the same envelope.
    assert response.data['success'] is False
    assert 'errors' in response.data


@pytest.mark.django_db
def test_validation_error_uses_envelope(api_client):
    response = api_client.post(reverse('auth-login'), {'email': 'not-an-email'}, format='json')
    assert response.status_code == 400
    assert response.data['success'] is False
    assert 'email' in response.data['errors']
    assert 'password' in response.data['errors']


@pytest.mark.django_db
def test_ws_ticket_is_single_use(auth_client, user):
    from accounts.services.ws_ticket_service import redeem_ticket

    ticket = auth_client.post(reverse('auth-ws-ticket')).data['data']['ticket']
    assert redeem_ticket(ticket=ticket) == user.pk
    # Redeeming burns the ticket, so replaying the same handshake URL fails.
    assert redeem_ticket(ticket=ticket) is None


@pytest.mark.django_db
def test_logout_revokes_the_access_token(api_client, user):
    tokens = api_client.post(
        reverse('auth-login'),
        {'email': user.email, 'password': 'Test@1234'},
        format='json',
    ).data['data']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert api_client.get(reverse('auth-me')).status_code == 200

    api_client.post(reverse('auth-logout'))
    # Same token, now on the revocation list: it must stop working immediately
    # rather than at its natural expiry.
    assert api_client.get(reverse('auth-me')).status_code == 401
