"""Tests for the authentication subsystem."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from accounts.models import CustomerProfile, FarmerProfile, FarmerStatus, Role
from conftest import PASSWORD, login
from core.policies.roles import RoleCode
from core.services.ws_ticket import verify_and_consume_ws_ticket
from system.models import AuditAction, AuditLog

User = get_user_model()


@pytest.mark.django_db
def test_login_returns_token_pair_and_profile(api_client, user):
    response = login(api_client, user.email)

    assert response.status_code == 200
    body = response.data
    assert body['success'] is True
    assert body['request_id']
    assert {'access', 'refresh'} <= body['data'].keys()
    assert body['data']['user']['email'] == user.email
    assert body['data']['user']['role'] == RoleCode.CUSTOMER
    assert 'password' not in body['data']['user']


@pytest.mark.django_db
def test_me_matches_pass_4b_schema(auth_client, user):
    CustomerProfile.objects.create(user=user, full_name='Nguyễn Văn A', phone='0901234567', address='Q1')

    me = auth_client.get(reverse('auth-me')).data['data']

    assert set(me) == {'id', 'email', 'role', 'must_change_password', 'display_name', 'farmer_status'}
    assert (me['display_name'], me['farmer_status']) == ('Nguyễn Văn A', None)


@pytest.mark.django_db
def test_me_shows_stall_name_and_status_for_farmer(api_client):
    role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Nông dân'})[0]
    farmer = User.objects.create_user(email='farmer@test.com', password=PASSWORD, role=role)
    FarmerProfile.objects.create(
        user=farmer, stall_name='Rau Sạch Đà Lạt', contact_person='Bà Tư', phone='0907654321', address='Chợ Bến Thành',
    )
    api_client.force_authenticate(user=farmer)

    me = api_client.get(reverse('auth-me')).data['data']

    assert (me['role'], me['display_name'], me['farmer_status']) == (
        RoleCode.FARMER, 'Rau Sạch Đà Lạt', FarmerStatus.PENDING,
    )


@pytest.mark.django_db
def test_login_normalizes_email(api_client, user):
    assert login(api_client, '  USER@Test.COM ').status_code == 200


@pytest.mark.django_db
def test_failed_login_is_401_and_audited(api_client, user):
    response = login(api_client, user.email, password='wrong')

    assert response.status_code == 401
    assert response.data['success'] is False
    assert response.data['code'] == 'AUTHENTICATION_FAILED'
    entry = AuditLog.objects.get(action=AuditAction.LOGIN_FAILED)
    assert entry.status_code == 401
    assert entry.user is None
    assert entry.details == {'email': user.email}
    assert (entry.method, entry.endpoint) == ('POST', '/api/auth/login/')
    assert entry.request_id == response.data['request_id']


@pytest.mark.django_db
def test_successful_login_is_audited(api_client, user):
    login(api_client, user.email)
    entry = AuditLog.objects.get(action=AuditAction.LOGIN)
    assert (entry.user, entry.status_code) == (user, 200)


@pytest.mark.django_db
def test_login_is_throttled_after_five_attempts(api_client, user):
    for _ in range(5):
        login(api_client, user.email, password='wrong')
    response = login(api_client, user.email, password='wrong')

    assert response.status_code == 429
    assert response.data['code'] == 'RATE_LIMIT_EXCEEDED'
    assert 'Retry-After' in response


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get(reverse('auth-me'))

    assert response.status_code == 401
    assert response.data['success'] is False
    assert response.data['code'] == 'AUTHENTICATION_FAILED'


@pytest.mark.django_db
def test_validation_error_uses_envelope(api_client):
    response = api_client.post(reverse('auth-login'), {'email': 'not-an-email'}, format='json')

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert {'email', 'password'} <= response.data['errors'].keys()


@pytest.mark.django_db
def test_ws_ticket_is_single_use_and_carries_role(auth_client, user):
    data = auth_client.post(reverse('auth-ws-ticket')).data['data']

    assert data['expires_in'] == 30
    assert verify_and_consume_ws_ticket(data['ticket']) == {'user_id': user.pk, 'role': RoleCode.CUSTOMER}
    # Redeeming burns the ticket, so replaying the same handshake URL fails.
    assert verify_and_consume_ws_ticket(data['ticket']) is None


@pytest.mark.django_db
def test_logout_blacklists_access_and_refresh_tokens(api_client, user):
    tokens = login(api_client, user.email).data['data']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert api_client.get(reverse('auth-me')).status_code == 200

    api_client.post(reverse('auth-logout'), {'refresh': tokens['refresh']}, format='json')

    response = api_client.get(reverse('auth-me'))
    assert response.status_code == 401
    assert response.data['code'] == 'TOKEN_BLACKLISTED'
    api_client.credentials()
    refresh = api_client.post(reverse('auth-refresh'), {'refresh': tokens['refresh']}, format='json')
    assert refresh.data['code'] == 'TOKEN_BLACKLISTED'
    assert AuditLog.objects.filter(action=AuditAction.LOGOUT, user=user).exists()


@pytest.mark.django_db
def test_refresh_rotates_and_old_refresh_cannot_be_reused(api_client, user):
    tokens = login(api_client, user.email).data['data']

    first = api_client.post(reverse('auth-refresh'), {'refresh': tokens['refresh']}, format='json')
    assert first.status_code == 200
    assert first.data['data']['refresh'] != tokens['refresh']

    replay = api_client.post(reverse('auth-refresh'), {'refresh': tokens['refresh']}, format='json')
    assert replay.status_code == 401
    assert replay.data['code'] == 'TOKEN_BLACKLISTED'

    second = api_client.post(reverse('auth-refresh'), {'refresh': first.data['data']['refresh']}, format='json')
    assert second.status_code == 200


@pytest.mark.django_db
def test_change_password_rejects_wrong_current_and_weak_new(auth_client):
    response = auth_client.post(
        reverse('auth-change-password'),
        {'current_password': 'wrong', 'new_password': '123'},
        format='json',
    )
    assert response.status_code == 400
    assert {'current_password', 'new_password'} <= response.data['errors'].keys()


@pytest.mark.django_db
def test_change_password_succeeds_and_is_audited(api_client, user):
    user.must_change_password = True
    user.save()
    access = login(api_client, user.email).data['data']['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    response = api_client.post(
        reverse('auth-change-password'),
        {'current_password': PASSWORD, 'new_password': 'N3w-Str0ng-Passw0rd!'},
        format='json',
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password('N3w-Str0ng-Passw0rd!')
    assert user.must_change_password is False
    assert AuditLog.objects.filter(action=AuditAction.PASSWORD_CHANGED, user=user).exists()
    assert api_client.get(reverse('auth-me')).data['code'] == 'TOKEN_BLACKLISTED'


@pytest.mark.django_db
def test_create_superuser_gets_admin_role():
    admin = User.objects.create_superuser(email=' Boss@Example.COM ', password=PASSWORD)

    assert admin.email == 'boss@example.com'
    assert admin.role.code == RoleCode.ADMIN
    assert admin.is_staff and admin.is_superuser


@pytest.mark.django_db
def test_create_user_requires_role():
    with pytest.raises(ValueError):
        User.objects.create_user(email='x@test.com', password=PASSWORD)
