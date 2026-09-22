"""Shared pytest fixtures."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture(autouse=True)
def local_backends(settings):
    """Keep tests off Redis: in-process cache and channel layer."""
    settings.CACHES = {
        'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'},
    }
    settings.CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(email='user@test.com', password='Test@1234')


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email='admin@test.com', password='Test@1234')


@pytest.fixture
def auth_client(api_client, user):
    """Client authenticated as a plain user, bypassing the login round-trip."""
    api_client.force_authenticate(user=user)
    return api_client
