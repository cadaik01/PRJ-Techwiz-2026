"""Shared pytest fixtures."""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import Role

User = get_user_model()
PASSWORD = 'Test@1234'


@pytest.fixture(autouse=True)
def local_backends(settings):
    """Keep tests off Redis, and start each test with empty throttle and blacklist state."""
    settings.CACHES = {
        'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'},
    }
    settings.CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def member_role(db):
    # Stand-in for an SRS actor; the real codes come from the exam brief.
    return Role.objects.create(code='MEMBER', name='Member')


@pytest.fixture
def user(member_role):
    return User.objects.create_user(email='user@test.com', password=PASSWORD, role=member_role)


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email='admin@test.com', password=PASSWORD)


@pytest.fixture
def auth_client(api_client, user):
    """Client authenticated as a plain user, bypassing the login round-trip."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


def login(client, email, password=PASSWORD):
    return client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
