"""Public farmer directory, profile and reviews (FR-12, FR-27, PU-06, PU-07, PU-09, U-05)."""

from datetime import time

import pytest
from django.urls import reverse

from accounts.models import FarmerStatus
from catalog.models import Category
from manager.conftest import make_customer, make_farmer, make_market, make_order, make_product
from markets.models import FarmerMarket, PickupSlot
from orders.models import OrderStatus
from reviews.models import FarmerReview

LIST_URL = reverse('public-farmer-list')


def slot(farmer, market, day=6, active=True, stall_label=None):
    farmer_market = FarmerMarket.objects.get_or_create(farmer=farmer, market=market,
                                                       defaults={'stall_label': stall_label or 'Sạp A1'})[0]
    PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=day, start_time=time(6), end_time=time(8),
                              is_active=active)


def review(farmer, market, rating, hidden=False, customer=None):
    customer = customer or make_customer(f'k{FarmerReview.objects.count()}@test.com', full_name='Nguyễn Văn An')
    order = make_order(customer, farmer, market, [(make_product(farmer, name=f'Món {rating}'), 1)],
                       status=OrderStatus.COMPLETED)
    return FarmerReview.objects.create(order=order, rating=rating, comment='Fresh', is_hidden_by_admin=hidden)


def stalls(client, **params):
    return [row['stall_name'] for row in client.get(LIST_URL, params).data['data']['results']]


@pytest.fixture
def directory(db):
    ben_thanh = make_market()
    tan_dinh = make_market('Chợ Tân Định')
    rau = make_farmer('rau@test.com', stall_name='Rau Sạch', latitude=10.7725, longitude=106.6981)
    xoai = make_farmer('xoai@test.com', stall_name='Xoài Cát', latitude=10.8231, longitude=106.6297)
    nam = make_farmer('nam@test.com', stall_name='Nấm Rơm')                        # no coordinates
    make_farmer('cho@test.com', stall_name='Chờ Duyệt', status=FarmerStatus.PENDING)
    slot(rau, ben_thanh, day=6)
    slot(xoai, tan_dinh, day=7)
    slot(nam, ben_thanh, day=7, active=False)
    review(rau, ben_thanh, 5)
    review(xoai, tan_dinh, 3)
    review(xoai, tan_dinh, 1, hidden=True)
    return {'ben_thanh': ben_thanh, 'tan_dinh': tan_dinh, 'rau': rau, 'xoai': xoai, 'nam': nam}


@pytest.mark.django_db
def test_directory_lists_public_farmers_only(api_client, directory):
    assert stalls(api_client) == ['Nấm Rơm', 'Rau Sạch', 'Xoài Cát']


@pytest.mark.django_db
def test_directory_orderings(api_client, directory):
    make_product(directory['nam'], name='Sold out', stock=0)

    assert stalls(api_client, ordering='rating') == ['Rau Sạch', 'Xoài Cát', 'Nấm Rơm']
    assert stalls(api_client, ordering='distance', lat=10.7725, lng=106.6981) == ['Rau Sạch', 'Xoài Cát', 'Nấm Rơm']
    assert stalls(api_client, ordering='in_stock')[-1] == 'Nấm Rơm'
    assert api_client.get(LIST_URL, {'ordering': 'distance'}).status_code == 400


@pytest.mark.django_db
def test_directory_filters(api_client, directory):
    fruit = Category.objects.create(name='Trái cây')
    mango = make_product(directory['xoai'], name='Xoài', stock=3)
    mango.category = fruit
    mango.save()

    assert stalls(api_client, q='nam') == ['Nấm Rơm']
    assert stalls(api_client, market_id=directory['ben_thanh'].pk) == ['Nấm Rơm', 'Rau Sạch']
    assert stalls(api_client, day=7) == ['Xoài Cát']                       # Nấm Rơm's day-7 slot is off
    assert stalls(api_client, market_id=directory['ben_thanh'].pk, day=7) == []
    assert stalls(api_client, category_id=fruit.pk) == ['Xoài Cát']


@pytest.mark.django_db
def test_distance_is_null_without_coordinates(api_client, directory):
    rows = api_client.get(LIST_URL, {'lat': 10.7725, 'lng': 106.6981}).data['data']['results']

    distances = {row['stall_name']: row['distance_km'] for row in rows}
    assert distances['Nấm Rơm'] is None
    assert distances['Rau Sạch'] == 0


@pytest.mark.django_db
def test_profile_is_farmer_public(api_client, directory):
    data = api_client.get(reverse('public-farmer-detail', args=[directory['rau'].pk])).json()['data']

    assert {'contact_person', 'phone', 'address', 'description', 'latitude', 'longitude',
            'order_cutoff_hours', 'pickup_windows', 'rating_avg', 'operating_days'} <= set(data)
    assert (data['latitude'], data['order_cutoff_hours'], data['rating_avg']) == (10.7725, 12, 5.0)
    window = data['pickup_windows'][0]
    assert (window['market_name'], window['slots'][0]['start_time']) == ('Chợ Bến Thành', '06:00')
    assert 'email' not in data and 'status' not in data


@pytest.mark.django_db
def test_profile_of_non_public_farmer_is_404(api_client, directory):
    pending = make_farmer('p2@test.com', status=FarmerStatus.PENDING)

    assert api_client.get(reverse('public-farmer-detail', args=[pending.pk])).status_code == 404


@pytest.mark.django_db
def test_reviews_have_summary_page_of_10_and_no_hidden_ones(api_client, directory):
    for _ in range(11):
        review(directory['xoai'], directory['tan_dinh'], 4)

    data = api_client.get(reverse('public-farmer-reviews', args=[directory['xoai'].pk])).data['data']

    assert data['summary'] == {'rating_avg': 3.9, 'rating_count': 12,
                               'distribution': {'1': 0, '2': 0, '3': 1, '4': 11, '5': 0}}
    assert (data['count'], data['page_size'], data['total_pages'], len(data['results'])) == (12, 10, 2, 10)
    row = data['results'][0]
    assert set(row) == {'id', 'type', 'rating', 'comment', 'customer_display_name', 'product', 'reply',
                        'replied_at', 'created_at'}
    assert (row['type'], row['customer_display_name'], row['product']) == ('FARMER', 'Nguyễn V. A.', None)


@pytest.mark.django_db
def test_reviews_rating_filter_keeps_full_summary(api_client, directory):
    data = api_client.get(reverse('public-farmer-reviews', args=[directory['xoai'].pk]), {'rating': 1}).data['data']

    assert (data['count'], data['summary']['rating_count']) == (0, 1)       # the 1-star review is hidden
