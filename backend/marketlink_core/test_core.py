"""Tests for the shared core layer: request id, envelope and exception mapping."""

import uuid
from types import SimpleNamespace

import pytest
from django.db import IntegrityError, transaction
from django.db.utils import DataError, OperationalError
from django.urls import reverse
from rest_framework.test import APIRequestFactory

from accounts.models import Role
from marketlink_core.context import reset_request_id, set_request_id
from marketlink_core.exceptions import BusinessValidationError
from marketlink_core.signals import attach_history_request_id
from marketlink_core.utils import custom_exception_handler


def _handle(exc):
    request = APIRequestFactory().get('/api/anything/')
    return custom_exception_handler(exc, {'request': request, 'view': None})


@pytest.mark.django_db
def test_request_id_is_generated_and_echoed(api_client):
    response = api_client.get(reverse('public-config'))

    request_id = response['X-Request-ID']
    assert uuid.UUID(request_id)
    assert response.data['request_id'] == request_id


@pytest.mark.django_db
def test_client_request_id_is_kept_only_if_it_is_a_uuid(api_client):
    supplied = str(uuid.uuid4())
    assert api_client.get(reverse('public-config'), HTTP_X_REQUEST_ID=supplied)['X-Request-ID'] == supplied

    forged = api_client.get(reverse('public-config'), HTTP_X_REQUEST_ID='x\nFAKE LOG LINE')
    assert forged['X-Request-ID'] != 'x\nFAKE LOG LINE'
    assert uuid.UUID(forged['X-Request-ID'])


@pytest.mark.django_db
def test_real_mysql_duplicate_entry_maps_to_409():
    Role.objects.create(code='DUP', name='first')
    with pytest.raises(IntegrityError) as caught, transaction.atomic():
        Role.objects.create(code='DUP', name='second')

    response = _handle(caught.value)
    assert response.status_code == 409
    assert response.data['code'] == 'RESOURCE_CONFLICT'


@pytest.mark.parametrize(
    ('exc', 'status', 'code'),
    [
        (IntegrityError(1452, 'fk'), 409, 'RESOURCE_CONFLICT'),
        (DataError(1406, 'too long'), 400, 'VALIDATION_ERROR'),
        (OperationalError(1213, 'deadlock'), 409, 'CONCURRENCY_DEADLOCK'),
    ],
)
def test_mysql_errors_map_to_catalog(exc, status, code):
    response = _handle(exc)
    assert (response.status_code, response.data['code']) == (status, code)


def test_unhandled_exception_is_500_without_leaking_details():
    response = _handle(RuntimeError('SELECT * FROM secret_table'))

    assert response.status_code == 500
    assert response.data['code'] == 'INTERNAL_SERVER_ERROR'
    assert 'secret_table' not in str(response.data)


def test_business_exception_keeps_its_message_code_and_errors():
    exc = BusinessValidationError('Not enough stock', code='INSUFFICIENT_STOCK', errors={'quantity': ['Too many.']})
    response = _handle(exc)

    assert response.status_code == 400
    assert response.data['message'] == 'Not enough stock'
    assert response.data['code'] == 'INSUFFICIENT_STOCK'
    assert response.data['errors'] == {'quantity': ['Too many.']}


def test_history_signal_stamps_request_id():
    history_instance = SimpleNamespace(request_id=None)
    token = set_request_id('abc-123')
    try:
        attach_history_request_id(sender=None, history_instance=history_instance)
    finally:
        reset_request_id(token)
    assert history_instance.request_id == 'abc-123'
