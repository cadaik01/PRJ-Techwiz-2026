"""Admin market management (FR-53, AD-14 -> AD-17, A-05, A-06, U-04)."""

import io
import os
from datetime import datetime, time, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from PIL import Image

from accounts.models import FarmerProfile, FarmerStatus, Role
from conftest import PASSWORD
from marketlink_core.policies.roles import RoleCode
from markets.models import FarmerMarket, Market, MarketOperatingDay, PickupSlot
from orders.models import Order, OrderStatus

User = get_user_model()

LIST_URL = reverse('admin-market-list')

VALID = {
    'name': 'Chợ Bến Thành',
    'address': 'Lê Lợi, Quận 1, TP.HCM',
    'latitude': 10.772450,
    'longitude': 106.698060,
    'operating_days': [6, 7],
    'open_time': '05:00',
    'close_time': '11:00',
}


def detail_url(market, action=None):
    name = f'admin-market-{action}' if action else 'admin-market-detail'
    return reverse(name, args=[market.pk])


def make_market(name='Chợ Hòa Bình', days=(6, 7), open_time=time(5), close_time=time(11), **extra):
    market = Market.objects.create(
        name=name, address='Quận 5, TP.HCM', latitude=10.75, longitude=106.66,
        open_time=open_time, close_time=close_time, **extra,
    )
    for day in days:
        MarketOperatingDay.objects.create(market=market, day_of_week=day)
    return market


def make_farmer(email, status=FarmerStatus.APPROVED):
    role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Farmer'})[0]
    user = User.objects.create_user(email=email, password=PASSWORD, role=role)
    return FarmerProfile.objects.create(
        user=user, stall_name=f'Sạp {email}', contact_person='Bà Tư', phone='0907654321',
        address='Quận 5', status=status,
    )


def add_slot(market, farmer, day=6, start=time(6), end=time(8)):
    farmer_market = FarmerMarket.objects.get_or_create(
        farmer=farmer, market=market, defaults={'stall_label': 'Sạp A1'},
    )[0]
    return PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=day, start_time=start, end_time=end)


def add_order(market, farmer, customer, status=OrderStatus.PLACED):
    start = timezone.make_aware(datetime(2026, 10, 3, 6))
    return Order.objects.create(
        customer=customer, farmer=farmer, market=market, pickup_date=start.date(), status=status,
        pickup_start_at=start, pickup_end_at=start + timedelta(hours=2),
        cutoff_at=start - timedelta(hours=12), total_amount=30000,
    )


def png_file(name='cho.png', fmt='PNG', size=(8, 8)):
    buffer = io.BytesIO()
    Image.new('RGB', size, 'green').save(buffer, fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


@pytest.fixture(autouse=True)
def media_in_tmp(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.mark.django_db
def test_customer_is_refused(auth_client):
    assert auth_client.get(LIST_URL).status_code == 403


@pytest.mark.django_db
def test_list_is_paginated_per_contract_and_includes_inactive(admin_client):
    make_market('Chợ A')
    make_market('Chợ B', is_active=False)

    data = admin_client.get(LIST_URL).data['data']

    assert (data['count'], data['page'], data['page_size'], data['total_pages']) == (2, 1, 20, 1)
    assert (data['next'], data['previous']) == (None, None)
    assert [row['name'] for row in data['results']] == ['Chợ A', 'Chợ B']


@pytest.mark.django_db
def test_list_row_matches_market_admin_schema(admin_client, user):
    market = make_market(days=(7, 2))
    approved = make_farmer('a@test.com')
    add_slot(market, approved)
    add_slot(market, approved, day=7)                           # same farmer twice: counted once
    FarmerMarket.objects.create(farmer=make_farmer('p@test.com', FarmerStatus.PENDING), market=market,
                                stall_label='Sạp C3')
    add_order(market, approved, user)
    add_order(market, approved, user, status=OrderStatus.ACCEPTED)
    add_order(market, approved, user, status=OrderStatus.COMPLETED)

    row = admin_client.get(LIST_URL).json()['data']['results'][0]

    assert set(row) == {
        'id', 'name', 'address', 'image', 'latitude', 'longitude', 'operating_days', 'open_time',
        'close_time', 'farmer_count', 'distance_km', 'is_favorite', 'description', 'map_provider',
        'is_active', 'open_order_count', 'created_at', 'updated_at',
    }
    assert row['operating_days'] == [2, 7]
    assert (row['open_time'], row['close_time']) == ('05:00', '11:00')
    assert (row['farmer_count'], row['open_order_count']) == (1, 2)
    assert (row['latitude'], row['map_provider'], row['distance_km'], row['is_favorite']) == (10.75, 'OSM', None, None)
    assert row['created_at'].endswith('+07:00')


@pytest.mark.django_db
def test_list_filters_by_text_and_status(admin_client):
    make_market('Chợ Bến Thành')
    make_market('Chợ Tân Định', is_active=False)

    def names(**params):
        return [row['name'] for row in admin_client.get(LIST_URL, params).data['data']['results']]

    assert names(q='ben thanh') == ['Chợ Bến Thành']           # ai_ci search ignores accents
    assert names(q='quận 5') == ['Chợ Bến Thành', 'Chợ Tân Định']
    assert names(is_active='false') == ['Chợ Tân Định']


@pytest.mark.django_db
def test_create_json_returns_201_and_stores_days(admin_client):
    response = admin_client.post(LIST_URL, {**VALID, 'operating_days': [7, 6, 6]}, format='json')

    assert response.status_code == 201
    data = response.json()['data']
    assert (data['name'], data['operating_days'], data['is_active'], data['image']) == (
        'Chợ Bến Thành', [6, 7], True, None,
    )
    assert data['latitude'] == 10.77245


@pytest.mark.django_db
def test_create_multipart_with_image_gets_random_name_and_absolute_url(admin_client):
    response = admin_client.post(LIST_URL, {**VALID, 'image': png_file('ảnh chợ.png')}, format='multipart')

    assert response.status_code == 201
    url = response.data['data']['image']
    assert url.startswith('http://testserver/media/markets/') and url.endswith('.png')
    assert 'ảnh' not in url


@pytest.mark.django_db
def test_executable_renamed_to_jpg_is_rejected(admin_client):
    # CT-18 pattern.
    fake = SimpleUploadedFile('virus.jpg', b'MZ\x90\x00' + b'\x00' * 200, content_type='image/jpeg')

    response = admin_client.post(LIST_URL, {**VALID, 'image': fake}, format='multipart')

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert 'image' in response.data['errors']


@pytest.mark.django_db
def test_gif_and_oversized_images_are_rejected(admin_client):
    gif = png_file('cho.gif', fmt='GIF')
    assert admin_client.post(LIST_URL, {**VALID, 'image': gif}, format='multipart').status_code == 400

    big = SimpleUploadedFile('big.png', png_file().read() + b'\x00' * (2 * 1024 * 1024), content_type='image/png')
    response = admin_client.post(LIST_URL, {**VALID, 'image': big}, format='multipart')
    assert response.data['errors']['image'] == ['The image must be JPG, PNG or WEBP, at most 2 MB']


@pytest.mark.django_db
@pytest.mark.parametrize('field, value, message', [
    ('name', 'X', 'Please enter 2–100 characters'),
    ('address', 'Q1', 'Please enter the full address'),
    ('operating_days', [], 'Choose at least one operating day'),
    ('latitude', 91, 'Invalid coordinates'),
    ('longitude', 106.1234567, 'Invalid coordinates'),
    ('close_time', '05:00', 'The closing time must be after the opening time'),
])
def test_create_validation(admin_client, field, value, message):
    response = admin_client.post(LIST_URL, {**VALID, field: value}, format='json')

    assert response.status_code == 400
    assert response.data['errors'][field] == [message]


@pytest.mark.django_db
def test_operating_day_out_of_range_is_rejected(admin_client):
    response = admin_client.post(LIST_URL, {**VALID, 'operating_days': [0, 8]}, format='json')

    assert response.status_code == 400
    assert 'operating_days' in response.data['errors']


@pytest.mark.django_db
def test_duplicate_name_ignores_case(admin_client):
    make_market('Chợ Bến Thành')

    response = admin_client.post(LIST_URL, {**VALID, 'name': 'CHỢ BẾN THÀNH'}, format='json')

    assert response.data['errors']['name'] == ['A market with this name already exists']


@pytest.mark.django_db
def test_get_detail_and_404(admin_client):
    market = make_market()

    assert admin_client.get(detail_url(market)).data['data']['id'] == market.pk
    assert admin_client.get(reverse('admin-market-detail', args=[999])).data['code'] == 'NOT_FOUND'


@pytest.mark.django_db
def test_patch_is_partial_and_checks_hours_against_stored_value(admin_client):
    market = make_market()

    ok = admin_client.patch(detail_url(market), {'description': 'Chợ cuối tuần', 'operating_days': [5, 6, 7]},
                            format='json')
    assert ok.status_code == 200
    assert (ok.data['data']['description'], ok.data['data']['operating_days']) == ('Chợ cuối tuần', [5, 6, 7])

    bad = admin_client.patch(detail_url(market), {'close_time': '04:30'}, format='json')
    assert bad.data['errors']['close_time'] == ['The closing time must be after the opening time']


@pytest.mark.django_db
def test_patch_keeps_own_name(admin_client):
    market = make_market()

    assert admin_client.patch(detail_url(market), {'name': market.name}, format='json').status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize('change', [
    {'operating_days': [7]},                  # the slot is on Saturday (6)
    {'open_time': '06:30'},                   # the slot starts at 06:00
    {'close_time': '07:30'},                  # the slot ends at 08:00
])
def test_schedule_change_that_strands_a_slot_is_refused(admin_client, change):
    market = make_market()
    slot = add_slot(market, make_farmer('a@test.com'))
    slot.is_active = False                    # an inactive slot still counts: it can be switched back on
    slot.save()

    response = admin_client.patch(detail_url(market), change, format='json')

    assert response.status_code == 422
    assert response.data['code'] == 'RESOURCE_IN_USE'
    assert response.data['message'].startswith('1 farmer pickup slots')
    market.refresh_from_db()
    assert (market.open_time, market.close_time) == (time(5), time(11))
    assert sorted(market.operating_days.values_list('day_of_week', flat=True)) == [6, 7]


@pytest.mark.django_db
def test_schedule_change_that_keeps_slots_inside_is_allowed(admin_client):
    market = make_market()
    add_slot(market, make_farmer('a@test.com'))

    response = admin_client.patch(
        detail_url(market), {'operating_days': [1, 6], 'open_time': '06:00', 'close_time': '12:00'}, format='json',
    )

    assert response.status_code == 200
    assert response.data['data']['operating_days'] == [1, 6]


@pytest.mark.django_db
def test_replacing_the_image_deletes_the_old_file(admin_client, django_capture_on_commit_callbacks):
    created = admin_client.post(LIST_URL, {**VALID, 'image': png_file()}, format='multipart').data['data']
    market = Market.objects.get(pk=created['id'])
    old_path = market.image.path

    with django_capture_on_commit_callbacks(execute=True):
        response = admin_client.patch(detail_url(market), {'image': png_file('moi.webp', fmt='WEBP')},
                                      format='multipart')

    assert response.status_code == 200
    assert response.data['data']['image'].endswith('.webp')
    assert not os.path.exists(old_path)


@pytest.mark.django_db
def test_deactivate_and_activate(admin_client, user):
    market = make_market()
    add_order(market, make_farmer('a@test.com'), user)

    off = admin_client.post(detail_url(market, 'deactivate'))
    assert off.status_code == 200
    assert (off.data['data']['is_active'], off.data['data']['open_order_count']) == (False, 1)
    # Deactivating only hides the market; its open orders are untouched (D-017).
    assert Order.objects.get(market=market).status == OrderStatus.PLACED

    on = admin_client.post(detail_url(market, 'activate'))
    assert on.data['data']['is_active'] is True
