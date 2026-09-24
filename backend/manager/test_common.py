"""Unit tests for the shared manager helpers: retry, dates, images and notify."""

import io
from datetime import date, datetime

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import OperationalError
from django.utils import timezone
from PIL import Image
from rest_framework import serializers

from manager.common import notify as notify_module
from manager.common.dates import day_range
from manager.common.images import IMAGE_RULE_MESSAGE, MAX_IMAGE_BYTES, validate_image_upload
from manager.common.notify import notify_user
from manager.common.retry import run_with_deadlock_retry
from manager.conftest import make_customer
from marketlink_core.exceptions import BusinessValidationError, ConflictError
from notifications.models import Notification, NotificationType

# --- retry (MySQL deadlock 1213) ------------------------------------------------

def flaky(failures):
    calls = []

    def operation():
        calls.append(1)
        if len(calls) <= failures:
            raise OperationalError(1213, 'Deadlock found when trying to get lock')
        return 'done'
    return operation, calls


def test_one_deadlock_is_retried():
    operation, calls = flaky(1)
    assert (run_with_deadlock_retry(operation), len(calls)) == ('done', 2)


def test_second_deadlock_is_conflict_retry():
    operation, calls = flaky(2)
    with pytest.raises(ConflictError) as error:
        run_with_deadlock_retry(operation)
    assert (error.value.code, len(calls)) == ('CONFLICT_RETRY', 2)


def test_other_database_errors_are_not_retried():
    calls = []

    def operation():
        calls.append(1)
        raise OperationalError(2006, 'MySQL server has gone away')

    with pytest.raises(OperationalError):
        run_with_deadlock_retry(operation)
    assert len(calls) == 1


# --- day_range (`from` / `to` query params) -------------------------------------

def aware(*args):
    return timezone.make_aware(datetime(*args))


def test_day_range_is_a_half_open_range_of_vietnam_days():
    start, end = day_range({'from': '2026-09-02', 'to': '2026-09-04'})

    # End is the start of the day after `to`, so the whole of 4 Sep is inside.
    assert (start, end) == (aware(2026, 9, 2), aware(2026, 9, 5))


@pytest.mark.parametrize('params, expected', [
    ({}, (None, None)),
    ({'from': '2026-09-02'}, (aware(2026, 9, 2), None)),
    ({'to': '2026-09-02'}, (None, aware(2026, 9, 3))),
    ({'from': '  ', 'to': ''}, (None, None)),
])
def test_day_range_treats_each_bound_as_optional(params, expected):
    assert day_range(params) == expected


def test_day_range_can_require_both_bounds():
    with pytest.raises(BusinessValidationError) as error:
        day_range({}, required=True)

    assert set(error.value.errors) == {'from', 'to'}
    assert error.value.errors['from'] == ['Please choose a date']


@pytest.mark.parametrize('params, field', [
    ({'from': '02/09/2026'}, 'from'),
    ({'to': 'yesterday'}, 'to'),
    ({'from': '2026-09-31'}, 'from'),                       # September has 30 days
    ({'from': '2026-09-05', 'to': '2026-09-01'}, 'to'),
])
def test_day_range_rejects_bad_dates(params, field):
    with pytest.raises(BusinessValidationError) as error:
        day_range(params)

    assert field in error.value.errors


def test_day_range_enforces_max_days_inclusively():
    span = {'from': '2026-09-01', 'to': '2026-09-03'}

    assert day_range(span, max_days=3) == (aware(2026, 9, 1), aware(2026, 9, 4))
    with pytest.raises(BusinessValidationError) as error:
        day_range(span, max_days=2)
    assert error.value.errors['to'] == ['The range can span at most 2 days']


# --- image upload validation (Pass 3 §1.5) --------------------------------------

def uploaded(name, content):
    return SimpleUploadedFile(name, content)


def image_file(name, fmt='PNG', size=(8, 8), tail=b''):
    """A real image of `fmt`, named `name`; `tail` pads it to test the size limit."""
    buffer = io.BytesIO()
    Image.new('RGB', size, 'green').save(buffer, fmt)
    return uploaded(name, buffer.getvalue() + tail)


def test_valid_image_keeps_its_extension_but_gets_a_random_name():
    uploaded = image_file('my holiday photo.PNG')

    validate_image_upload(uploaded)

    assert uploaded.name.endswith('.png')
    assert 'holiday' not in uploaded.name
    assert len(uploaded.name) == len('.png') + 32          # uuid4().hex
    assert uploaded.read()[:4] == b'\x89PNG'               # the file is rewound for the caller


@pytest.mark.parametrize('name', ['photo.gif', 'photo.bmp', 'photo.jpg.exe', 'photo'])
def test_extension_must_be_whitelisted(name):
    with pytest.raises(serializers.ValidationError) as error:
        validate_image_upload(image_file(name))

    assert error.value.detail == [IMAGE_RULE_MESSAGE]


def test_file_over_2mb_is_rejected():
    oversized = image_file('big.png', tail=b'\x00' * MAX_IMAGE_BYTES)

    with pytest.raises(serializers.ValidationError):
        validate_image_upload(oversized)


def test_content_must_really_be_an_image():
    # CT-18: an executable renamed .jpg.
    with pytest.raises(serializers.ValidationError):
        validate_image_upload(uploaded('virus.jpg', b'MZ\x90\x00' + b'\x00' * 200))


def test_truncated_image_is_rejected():
    whole = image_file('cut.png').read()

    with pytest.raises(serializers.ValidationError):
        validate_image_upload(uploaded('cut.png', whole[:len(whole) // 2]))


def test_real_format_wins_over_the_extension():
    # A GIF renamed .png passes the extension check but not the content check.
    gif = image_file('actually.gif', fmt='GIF')
    gif.name = 'actually.png'

    with pytest.raises(serializers.ValidationError):
        validate_image_upload(gif)


# --- notify_user (in-app always, email when a template is given) ----------------

EMAIL_CONTEXT = {
    'order_id': 7, 'customer_name': 'Alice', 'stall_name': 'Green Stall',
    'pickup_date': date(2026, 10, 3), 'market_name': 'Central Market', 'reason': 'Out of stock',
}


def send_declined(recipient, **overrides):
    notify_user(
        recipient=recipient, type=NotificationType.ORDER_DECLINED, title='Order #7 was declined',
        message='The stall cancelled it', target_url='/customer/orders/7',
        **{'email_template': 'order_declined', 'email_context': EMAIL_CONTEXT, **overrides},
    )


@pytest.mark.django_db
def test_in_app_row_is_written_and_the_email_is_rendered(customer_with_profile, on_commit):
    with on_commit():
        send_declined(customer_with_profile)

    notification = Notification.objects.get(recipient=customer_with_profile)
    assert (notification.type, notification.target_url) == (
        NotificationType.ORDER_DECLINED, '/customer/orders/7')
    message = mail.outbox[0]
    assert (message.to, message.subject) == ([customer_with_profile.email], 'Order #7 was declined')
    assert 'Order #7' in message.body and 'Out of stock' in message.body
    assert message.alternatives[0][1] == 'text/html'       # both templates are rendered


@pytest.mark.django_db
def test_no_email_without_a_template(customer_with_profile, on_commit):
    with on_commit():
        notify_user(
            recipient=customer_with_profile, type=NotificationType.RESTOCK,
            title='Back in stock', message='Cabbage is back',
        )

    assert Notification.objects.filter(recipient=customer_with_profile).exists()
    assert mail.outbox == []


@pytest.mark.django_db
def test_a_failing_mail_server_does_not_break_the_notification(customer_with_profile, monkeypatch, on_commit):
    def explode(*args, **kwargs):
        raise OSError('SMTP is down')

    monkeypatch.setattr(notify_module, 'send_mail', explode)

    with on_commit():
        send_declined(customer_with_profile)

    # Email is the secondary channel (D-010): the in-app row still stands.
    assert Notification.objects.filter(recipient=customer_with_profile).exists()
    assert mail.outbox == []


@pytest.mark.django_db
def test_email_goes_through_the_thread_pool_when_async(customer_with_profile, settings, monkeypatch, on_commit):
    settings.EMAIL_ASYNC = True
    submitted = []
    monkeypatch.setattr(notify_module._EMAIL_POOL, 'submit',
                        lambda func, **kwargs: submitted.append(kwargs))

    with on_commit():
        send_declined(customer_with_profile)

    # An admin locking an account with many orders is not kept waiting on SMTP.
    assert [entry['to'] for entry in submitted] == [customer_with_profile.email]
    assert mail.outbox == []


@pytest.mark.django_db
def test_nothing_is_sent_until_the_transaction_commits(customer_with_profile, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        send_declined(customer_with_profile)
        assert mail.outbox == []                            # deferred while the transaction is open

    # Two deferred callbacks: the WebSocket broadcast and the email.
    assert (len(callbacks), len(mail.outbox)) == (2, 1)


@pytest.fixture
def customer_with_profile(db):
    return make_customer()


@pytest.fixture
def on_commit(django_capture_on_commit_callbacks):
    """Run the on_commit callbacks notify_user defers, as a real commit would."""
    return lambda: django_capture_on_commit_callbacks(execute=True)
