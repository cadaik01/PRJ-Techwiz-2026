"""Public products (FR-14, FR-15, FR-27, PU-10 -> PU-12, Pass 4B §6.2)."""

from datetime import time

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import FarmerStatus
from catalog.models import Category, Product
from favorites.models import FavoriteProduct
from manager.conftest import make_customer, make_farmer, make_market, make_order, make_product
from markets.models import FarmerMarket, PickupSlot
from orders.models import OrderStatus
from reviews.models import ProductReview

LIST_URL = reverse('public-product-list')


def slot(farmer, market, day):
    farmer_market = FarmerMarket.objects.get_or_create(
        farmer=farmer, market=market, defaults={'stall_label': 'Sạp A1'},
    )[0]
    PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=day, start_time=time(6), end_time=time(8))


def product(farmer, name, **fields):
    created = make_product(farmer, name=name, stock=fields.pop('stock', 5), price=fields.pop('price', 20000))
    Product.objects.filter(pk=created.pk).update(**fields)
    created.refresh_from_db()
    return created


def names(client, **params):
    return [row['name'] for row in client.get(LIST_URL, params).data['data']['results']]


@pytest.fixture
def catalog(db):
    ben_thanh, tan_dinh = make_market(), make_market('Chợ Tân Định')
    rau = make_farmer('rau@test.com', stall_name='Rau Sạch')
    xoai = make_farmer('xoai@test.com', stall_name='Xoài Cát')
    pending = make_farmer('p@test.com', stall_name='Chờ Duyệt', status=FarmerStatus.PENDING)
    slot(rau, ben_thanh, 6)
    slot(xoai, tan_dinh, 7)
    fruit = Category.objects.create(name='Trái cây')
    items = {
        'cai': product(rau, 'Cải ngọt', price=15000),
        'ca_chua': product(rau, 'Cà chua', price=30000),
        'het': product(rau, 'Hết hàng', stock=0),
        'tam_ngung': product(rau, 'Tạm ngừng', is_available=False),
        'luu_tru': product(rau, 'Lưu trữ', is_archived=True),
        'bi_go': product(rau, 'Bị gỡ', is_hidden_by_admin=True),
        'xoai': product(xoai, 'Xoài cát', price=60000, category=fruit),
        'cho_duyet': product(pending, 'Của nông dân chờ duyệt'),
    }
    return {'ben_thanh': ben_thanh, 'rau': rau, 'xoai': xoai, 'fruit': fruit, **items}


@pytest.mark.django_db
def test_default_list_shows_only_public_in_stock_products(api_client, catalog):
    assert set(names(api_client)) == {'Cải ngọt', 'Cà chua', 'Xoài cát'}


@pytest.mark.django_db
def test_in_stock_false_adds_out_of_stock_and_paused(api_client, catalog):
    assert set(names(api_client, in_stock='false')) == {'Cải ngọt', 'Cà chua', 'Xoài cát', 'Hết hàng', 'Tạm ngừng'}


@pytest.mark.django_db
def test_ids_refresh_the_cart_without_archived_or_removed(api_client, catalog):
    ids = ','.join(str(catalog[key].pk) for key in ('cai', 'het', 'tam_ngung', 'luu_tru', 'bi_go', 'cho_duyet'))

    rows = api_client.get(LIST_URL, {'ids': ids}).data['data']['results']

    assert {row['name']: row['availability'] for row in rows} == {
        'Cải ngọt': 'IN_STOCK', 'Hết hàng': 'OUT_OF_STOCK', 'Tạm ngừng': 'UNAVAILABLE'}
    too_many = ','.join(str(n) for n in range(1, 52))
    assert api_client.get(LIST_URL, {'ids': too_many}).status_code == 400


@pytest.mark.django_db
def test_filters(api_client, catalog):
    assert names(api_client, q='ca chua') == ['Cà chua']
    assert names(api_client, category=catalog['fruit'].pk) == ['Xoài cát']
    assert set(names(api_client, farmer_id=catalog['rau'].pk)) == {'Cải ngọt', 'Cà chua'}
    assert set(names(api_client, price_min=20000, price_max=60000)) == {'Cà chua', 'Xoài cát'}
    assert set(names(api_client, market_id=catalog['ben_thanh'].pk)) == {'Cải ngọt', 'Cà chua'}
    assert names(api_client, day=7) == ['Xoài cát']
    assert names(api_client, market_id=catalog['ben_thanh'].pk, day=7) == []


@pytest.mark.django_db
def test_orderings(api_client, catalog):
    customer = make_customer()
    order = make_order(customer, catalog['xoai'].farmer, catalog['ben_thanh'], [(catalog['xoai'], 1)],
                       status=OrderStatus.COMPLETED)
    ProductReview.objects.create(order_item=order.items.get(), rating=5)

    assert names(api_client, ordering='price_asc') == ['Cải ngọt', 'Cà chua', 'Xoài cát']
    assert names(api_client, ordering='price_desc')[0] == 'Xoài cát'
    assert names(api_client, ordering='rating')[0] == 'Xoài cát'
    assert api_client.get(LIST_URL, {'ordering': 'cheap'}).status_code == 400


@pytest.mark.django_db
def test_card_schema_and_favorites(catalog, user):
    FavoriteProduct.objects.create(customer=user, product=catalog['cai'])
    client = APIClient()
    client.force_authenticate(user=user)

    rows = client.get(LIST_URL, {'ordering': 'price_asc'}).json()['data']['results']

    assert set(rows[0]) == {'id', 'name', 'image', 'price', 'unit', 'stock_quantity', 'is_available',
                            'availability', 'category', 'farmer', 'rating_avg', 'rating_count', 'is_favorite'}
    assert (rows[0]['price'], rows[0]['is_favorite'], rows[1]['is_favorite']) == (15000, True, False)
    assert rows[0]['farmer'] == {'id': catalog['rau'].pk, 'stall_name': 'Rau Sạch'}


@pytest.mark.django_db
def test_rating_count_is_not_multiplied_by_the_slot_join(api_client, catalog):
    slot(catalog['rau'], catalog['ben_thanh'], 7)                     # a second slot at the same market
    order = make_order(make_customer(), catalog['rau'], catalog['ben_thanh'], [(catalog['cai'], 1)],
                       status=OrderStatus.COMPLETED)
    ProductReview.objects.create(order_item=order.items.get(), rating=4)

    rows = api_client.get(LIST_URL, {'market_id': catalog['ben_thanh'].pk, 'q': 'cải'}).data['data']['results']

    assert (rows[0]['rating_count'], rows[0]['rating_avg']) == (1, 4.0)


@pytest.mark.django_db
def test_detail(api_client, catalog):
    data = api_client.get(reverse('public-product-detail', args=[catalog['het'].pk])).data['data']

    assert (data['availability'], data['description']) == ('OUT_OF_STOCK', None)
    assert data['markets'] == [{'market_id': catalog['ben_thanh'].pk, 'market_name': 'Chợ Bến Thành', 'days': [6]}]
    for hidden in ('luu_tru', 'bi_go', 'cho_duyet'):
        assert api_client.get(reverse('public-product-detail', args=[catalog[hidden].pk])).status_code == 404


@pytest.mark.django_db
def test_reviews(api_client, catalog):
    customer = make_customer(full_name='Lê Thị Hoa')
    for rating, hidden in ((5, False), (2, False), (1, True)):
        order = make_order(customer, catalog['rau'], catalog['ben_thanh'], [(catalog['cai'], 1)],
                           status=OrderStatus.COMPLETED)
        ProductReview.objects.create(order_item=order.items.get(), rating=rating, is_hidden_by_admin=hidden)

    data = api_client.get(reverse('public-product-reviews', args=[catalog['cai'].pk]), {'rating': 5}).data['data']

    assert data['summary'] == {'rating_avg': 3.5, 'rating_count': 2,
                               'distribution': {'1': 0, '2': 1, '3': 0, '4': 0, '5': 1}}
    assert data['count'] == 1
    row = data['results'][0]
    assert (row['type'], row['customer_display_name'], row['product']) == (
        'PRODUCT', 'Lê T. H.', {'id': catalog['cai'].pk, 'name': 'Cải ngọt'})
