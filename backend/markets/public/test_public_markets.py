"""Public markets (FR-10, FR-11, FR-13, PU-03 -> PU-05) and the public config (PU-01)."""

from datetime import time

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import FarmerStatus
from favorites.models import FavoriteFarmer, FavoriteMarket
from manager.conftest import make_customer, make_farmer, make_order, make_product
from markets.models import FarmerMarket, Market, MarketOperatingDay, PickupSlot
from orders.models import OrderStatus
from reviews.models import FarmerReview

LIST_URL = reverse('public-market-list')

# Real coordinates in Ho Chi Minh City; Ben Thanh is the "you are here" point.
BEN_THANH = (10.772450, 106.698060)


def market(name, lat, lng, days=(6, 7), **extra):
    created = Market.objects.create(name=name, address=f'{name}, TP.HCM', latitude=lat, longitude=lng,
                                    open_time=time(5), close_time=time(11), **extra)
    for day in days:
        MarketOperatingDay.objects.create(market=created, day_of_week=day)
    return created


def sells_at(farmer, where, day=6, stall_label=None, active=True):
    farmer_market = FarmerMarket.objects.get_or_create(farmer=farmer, market=where,
                                                       defaults={'stall_label': stall_label})[0]
    PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=day, start_time=time(6), end_time=time(8),
                              is_active=active)
    return farmer_market


@pytest.fixture
def city(db):
    return {
        'ben_thanh': market('Chợ Bến Thành', *BEN_THANH),
        'tan_dinh': market('Chợ Tân Định', 10.789780, 106.690190, days=(1, 6)),     # ~2.1 km
        'binh_tay': market('Chợ Bình Tây', 10.749950, 106.651070),                   # ~5.7 km
        'closed': market('Chợ Đã Đóng', 10.77, 106.69, is_active=False),
    }


def names(response):
    return [row['name'] for row in response.data['data']['results']]


@pytest.mark.django_db
def test_config(api_client):
    data = api_client.get(reverse('public-config')).data['data']

    assert data == {'ai_chat_enabled': False, 'booking_horizon_days': 7, 'max_open_orders_total': 5,
                    'max_open_orders_per_farmer': 1, 'max_upload_mb': 2}


@pytest.mark.django_db
def test_list_is_public_paginated_and_hides_inactive_markets(api_client, city):
    response = api_client.get(LIST_URL)

    assert response.status_code == 200
    data = response.data['data']
    assert (data['count'], data['page'], data['next']) == (3, 1, None)
    assert names(response) == ['Chợ Bến Thành', 'Chợ Bình Tây', 'Chợ Tân Định']
    row = response.json()['data']['results'][0]
    assert set(row) == {'id', 'name', 'address', 'image', 'latitude', 'longitude', 'operating_days',
                        'open_time', 'close_time', 'farmer_count', 'distance_km', 'is_favorite'}
    assert (row['operating_days'], row['open_time'], row['distance_km'], row['is_favorite']) == (
        [6, 7], '05:00', None, None)


@pytest.mark.django_db
def test_near_me_orders_by_distance(api_client, city):
    lat, lng = BEN_THANH

    response = api_client.get(LIST_URL, {'lat': lat, 'lng': lng, 'ordering': 'distance'})

    rows = response.json()['data']['results']
    assert [row['name'] for row in rows] == ['Chợ Bến Thành', 'Chợ Tân Định', 'Chợ Bình Tây']
    assert rows[0]['distance_km'] == 0
    assert 1.8 < rows[1]['distance_km'] < 2.4
    assert 5.2 < rows[2]['distance_km'] < 6.2


@pytest.mark.django_db
@pytest.mark.parametrize('params, field', [
    ({'ordering': 'distance'}, 'ordering'),
    ({'ordering': 'price'}, 'ordering'),
    ({'lat': 10.7}, 'lng'),
    ({'lat': 95, 'lng': 106}, 'lat'),
    ({'day': 8}, 'day'),
])
def test_list_validation(api_client, params, field):
    response = api_client.get(LIST_URL, params)

    assert (response.status_code, response.data['code']) == (400, 'VALIDATION_ERROR')
    assert field in response.data['errors']


@pytest.mark.django_db
def test_list_filters_by_text_and_day(api_client, city):
    assert names(api_client.get(LIST_URL, {'q': 'tan dinh'})) == ['Chợ Tân Định']
    assert names(api_client.get(LIST_URL, {'day': 1})) == ['Chợ Tân Định']


@pytest.mark.django_db
def test_farmer_count_only_counts_public_farmers(api_client, city):
    sells_at(make_farmer('a@test.com'), city['ben_thanh'])
    sells_at(make_farmer('b@test.com', status=FarmerStatus.PENDING), city['ben_thanh'])
    locked = make_farmer('c@test.com')
    locked.user.is_active = False
    locked.user.save()
    sells_at(locked, city['ben_thanh'])

    rows = api_client.get(LIST_URL).data['data']['results']

    assert {row['name']: row['farmer_count'] for row in rows}['Chợ Bến Thành'] == 1


@pytest.mark.django_db
def test_is_favorite_only_for_customers(city, user):
    FavoriteMarket.objects.create(customer=user, market=city['tan_dinh'])
    client = APIClient()
    client.force_authenticate(user=user)

    favorites = {row['name']: row['is_favorite'] for row in client.get(LIST_URL).data['data']['results']}

    assert favorites == {'Chợ Bến Thành': False, 'Chợ Bình Tây': False, 'Chợ Tân Định': True}


@pytest.mark.django_db
def test_detail_and_inactive_market_is_404(api_client, city):
    lat, lng = BEN_THANH
    detail = api_client.get(reverse('public-market-detail', args=[city['tan_dinh'].pk]), {'lat': lat, 'lng': lng})

    assert (detail.data['data']['map_provider'], detail.data['data']['description']) == ('OSM', None)
    assert detail.data['data']['distance_km'] > 1
    closed = api_client.get(reverse('public-market-detail', args=[city['closed'].pk]))
    assert (closed.status_code, closed.data['code']) == (404, 'NOT_FOUND')


@pytest.mark.django_db
def test_market_farmers_are_farmer_summaries_with_stall_label(api_client, city):
    rau = make_farmer('a@test.com')
    sells_at(rau, city['ben_thanh'], day=6, stall_label='Sạp B12')
    sells_at(rau, city['tan_dinh'], day=1)
    sells_at(make_farmer('p@test.com', stall_name='Chờ Duyệt', status=FarmerStatus.PENDING), city['ben_thanh'])
    customer = make_customer()
    done = make_order(customer, rau, city['ben_thanh'], [(make_product(rau), 1)], status=OrderStatus.COMPLETED)
    FarmerReview.objects.create(order=done, rating=4)

    response = api_client.get(reverse('public-market-farmers', args=[city['ben_thanh'].pk]))

    rows = response.data['data']['results']
    assert len(rows) == 1
    row = rows[0]
    assert set(row) == {'id', 'stall_name', 'image', 'rating_avg', 'rating_count', 'markets', 'operating_days',
                        'in_stock_product_count', 'distance_km', 'is_favorite', 'stall_label'}
    assert (row['id'], row['stall_label'], row['rating_avg'], row['rating_count']) == (rau.pk, 'Sạp B12', 4.0, 1)
    assert (row['operating_days'], row['in_stock_product_count'], row['is_favorite']) == ([1, 6], 1, None)
    assert [m['market_name'] for m in row['markets']] == ['Chợ Bến Thành', 'Chợ Tân Định']


@pytest.mark.django_db
def test_market_farmers_day_filter_uses_active_slots_at_this_market(api_client, city, user):
    saturday = make_farmer('a@test.com', stall_name='Thứ Bảy')
    sells_at(saturday, city['ben_thanh'], day=6)
    off = make_farmer('b@test.com', stall_name='Khung Tắt')
    sells_at(off, city['ben_thanh'], day=6, active=False)
    elsewhere = make_farmer('c@test.com', stall_name='Chợ Khác')
    sells_at(elsewhere, city['ben_thanh'], day=7)
    sells_at(elsewhere, city['tan_dinh'], day=6)
    FavoriteFarmer.objects.create(customer=user, farmer=saturday)
    client = APIClient()
    client.force_authenticate(user=user)

    rows = client.get(reverse('public-market-farmers', args=[city['ben_thanh'].pk]), {'day': 6}).data['data']['results']

    assert [(row['stall_name'], row['is_favorite']) for row in rows] == [('Thứ Bảy', True)]


@pytest.mark.django_db
def test_market_farmers_of_inactive_market_is_404(api_client, city):
    assert api_client.get(reverse('public-market-farmers', args=[city['closed'].pk])).status_code == 404
