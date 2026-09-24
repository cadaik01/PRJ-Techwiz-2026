"""Tests for the shared core layer: request id, envelope and exception mapping."""

import uuid
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser
from django.db import IntegrityError, transaction
from django.db.utils import DataError, OperationalError
from django.urls import reverse
from rest_framework.test import APIRequestFactory

from accounts.models import Role
from marketlink_core.context import reset_request_id, set_request_id
from marketlink_core.exceptions import (
    AuthenticationError,
    BusinessValidationError,
    ConflictError,
    ForbiddenActionError,
    PreconditionRequiredError,
    ResourceNotFoundError,
    UnprocessableEntityError,
)
from marketlink_core.permissions import IsAdmin
from marketlink_core.responses import api_response, custom_exception_handler
from marketlink_core.signals import attach_history_request_id


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
def test_real_mysql_duplicate_entry_maps_to_a_validation_error():
    Role.objects.create(code='DUP', name='first')
    with pytest.raises(IntegrityError) as caught, transaction.atomic():
        Role.objects.create(code='DUP', name='second')

    # A duplicate is the client's mistake, so it reads as a 400 rather than a server clash.
    response = _handle(caught.value)
    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'


@pytest.mark.parametrize(
    ('exc', 'status', 'code'),
    [
        (IntegrityError(1452, 'fk'), 422, 'RESOURCE_IN_USE'),
        (DataError(1406, 'too long'), 400, 'VALIDATION_ERROR'),
        (OperationalError(1213, 'deadlock'), 409, 'CONFLICT_RETRY'),
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


# --- api_response: the envelope every endpoint returns (Pass 4B §2.1) -----------

def test_success_envelope_has_the_five_frozen_keys():
    response = api_response(message='List retrieved', data={'count': 0})

    assert set(response.data) == {'success', 'message', 'request_id', 'data', 'errors'}
    assert (response.data['success'], response.data['data'], response.data['errors']) == (
        True, {'count': 0}, {})
    assert 'code' not in response.data                  # only failures carry a code


def test_missing_data_becomes_an_empty_object():
    assert api_response(message='OK').data['data'] == {}


def test_failure_envelope_adds_a_code_and_flips_success():
    response = api_response(message='Not found', status_code=404)

    assert (response.status_code, response.data['success'], response.data['code']) == (404, False, 'NOT_FOUND')


@pytest.mark.parametrize('status_code, code', [
    (400, 'VALIDATION_ERROR'),
    (401, 'NOT_AUTHENTICATED'),
    (403, 'PERMISSION_DENIED'),
    (409, 'RESOURCE_MODIFIED'),
    (422, 'FAILED_PRECONDITION'),
    (428, 'PRECONDITION_REQUIRED'),
    (429, 'THROTTLED'),
    (418, 'VALIDATION_ERROR'),                          # anything unlisted below 500
    (503, 'AI_UNAVAILABLE'),
])
def test_the_code_is_inferred_from_the_status(status_code, code):
    assert api_response(message='x', status_code=status_code).data['code'] == code


def test_an_explicit_code_wins_over_the_status():
    response = api_response(message='Sold out', status_code=400, code='INSUFFICIENT_STOCK')

    assert response.data['code'] == 'INSUFFICIENT_STOCK'


def test_the_request_id_comes_from_the_request_then_the_context():
    from types import SimpleNamespace

    assert api_response(message='x', request=SimpleNamespace(id='from-request')).data['request_id'] == 'from-request'

    token = set_request_id('from-context')
    try:
        assert api_response(message='x').data['request_id'] == 'from-context'
    finally:
        reset_request_id(token)


# --- exception classes (error catalog, Pass 4B §2.5) ----------------------------

@pytest.mark.parametrize('exception, status_code, code', [
    (BusinessValidationError('bad'), 400, 'VALIDATION_ERROR'),
    (AuthenticationError(), 401, 'NOT_AUTHENTICATED'),
    (ResourceNotFoundError(), 404, 'NOT_FOUND'),
    (ForbiddenActionError('no'), 403, 'ACTION_NOT_PERMITTED_FOR_ROLE'),
    (ConflictError('clash'), 409, 'RESOURCE_MODIFIED'),
    (UnprocessableEntityError('too late'), 422, 'FAILED_PRECONDITION'),
    (PreconditionRequiredError(), 428, 'PRECONDITION_REQUIRED'),
])
def test_each_exception_carries_its_status_and_default_code(exception, status_code, code):
    response = _handle(exception)

    assert (response.status_code, response.data['code']) == (status_code, code)
    assert response.data['message']                     # never blank, it is shown to the user


def test_a_422_names_the_rows_that_block_the_action():
    # RESOURCE_IN_USE tells the admin which orders stand in the way (FA-32: `errors.order_ids`).
    exception = UnprocessableEntityError('Still in use', code='RESOURCE_IN_USE',
                                         errors={'order_ids': ['7', '9']})

    response = _handle(exception)

    assert (response.status_code, response.data['code']) == (422, 'RESOURCE_IN_USE')
    assert response.data['errors'] == {'order_ids': ['7', '9']}


def test_drf_validation_details_are_normalised_into_errors():
    from rest_framework import exceptions as drf

    assert _handle(drf.ValidationError({'email': ['Required.']})).data['errors'] == {'email': ['Required.']}
    assert _handle(drf.ValidationError(['Bad request.'])).data['errors'] == {'non_field_errors': ['Bad request.']}
    assert _handle(drf.NotFound()).data['code'] == 'NOT_FOUND'
    assert _handle(drf.Throttled()).data['code'] == 'THROTTLED'


def test_a_django_validation_error_keeps_its_field_names():
    from django.core.exceptions import ValidationError as DjangoValidationError

    response = _handle(DjangoValidationError({'price': ['Too low.']}))

    assert (response.status_code, response.data['errors']) == (400, {'price': ['Too low.']})


# --- role permission -----------------------------------------------------------

@pytest.mark.django_db
def test_is_admin_accepts_only_the_admin_role(user, admin_user):
    request = APIRequestFactory().get('/api/admin/farmers/')

    request.user = AnonymousUser()
    assert IsAdmin().has_permission(request, None) is False

    request.user = user                                 # a customer
    assert IsAdmin().has_permission(request, None) is False

    request.user = admin_user
    assert IsAdmin().has_permission(request, None) is True
