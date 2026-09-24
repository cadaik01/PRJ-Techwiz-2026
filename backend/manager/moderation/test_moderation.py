"""Content moderation (FR-54, AD-20 -> AD-24, D-016, D-017)."""

from datetime import timedelta

import pytest
from django.urls import reverse

from catalog.models import Product
from manager.common.serializers import short_customer_name
from manager.conftest import make_customer, make_farmer, make_market, make_order, make_product
from orders.models import OrderStatus
from reviews.models import FarmerReview, ProductReview
from system.models import AuditAction, AuditLog

PRODUCTS_URL = reverse('admin-product-list')
REVIEWS_URL = reverse('admin-review-list')
REASON = {'reason': 'The photo shows a different product'}


@pytest.fixture
def shop(db):
    farmer = make_farmer()
    return {'farmer': farmer, 'market': make_market(), 'cabbage': make_product(farmer)}


def completed_order(shop, customer=None, quantity=1):
    customer = customer or make_customer()
    return make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], quantity)],
                      status=OrderStatus.COMPLETED)


@pytest.mark.django_db
def test_customer_is_refused(auth_client):
    assert auth_client.get(PRODUCTS_URL).status_code == 403
    assert auth_client.get(REVIEWS_URL).status_code == 403


@pytest.mark.django_db
def test_product_list_filters(admin_client, shop):
    other = make_farmer('f2@test.com', stall_name='Trái Cây Miền Tây')
    make_product(other, name='Xoài cát')
    hidden = make_product(shop['farmer'], name='Cà chua')
    Product.objects.filter(pk=hidden.pk).update(is_hidden_by_admin=True)

    def names(**params):
        return [row['name'] for row in admin_client.get(PRODUCTS_URL, params).data['data']['results']]

    assert set(names()) == {'Cải ngọt', 'Xoài cát', 'Cà chua'}
    assert names(q='mien tay') == ['Xoài cát']                        # stall name, accents ignored
    assert set(names(farmer_id=shop['farmer'].pk)) == {'Cải ngọt', 'Cà chua'}
    assert names(is_hidden='true') == ['Cà chua']
    row = admin_client.get(PRODUCTS_URL, {'q': 'xoai'}).data['data']['results'][0]
    assert row['farmer'] == {'id': other.pk, 'stall_name': 'Trái Cây Miền Tây'}


@pytest.mark.django_db
def test_hide_and_restore_product(admin_client, admin_user, shop):
    cabbage = shop['cabbage']

    hidden = admin_client.post(reverse('admin-product-hide', args=[cabbage.pk]), REASON, format='json')

    assert hidden.status_code == 200
    data = hidden.data['data']
    assert (data['is_hidden_by_admin'], data['hidden_reason'], data['availability']) == (
        True, REASON['reason'], 'UNAVAILABLE')
    cabbage.refresh_from_db()
    assert (cabbage.hidden_by, cabbage.hidden_at is not None) == (admin_user, True)

    restored = admin_client.post(reverse('admin-product-restore', args=[cabbage.pk]))

    assert (restored.data['data']['is_hidden_by_admin'], restored.data['data']['hidden_reason']) == (False, None)
    cabbage.refresh_from_db()
    assert (cabbage.hidden_by, cabbage.hidden_at) == (None, None)
    assert AuditLog.objects.get(action=AuditAction.PRODUCT_HIDDEN).details == {
        'product_id': cabbage.pk, 'reason': REASON['reason']}
    assert AuditLog.objects.filter(action=AuditAction.PRODUCT_RESTORED).exists()


@pytest.mark.django_db
def test_hide_needs_a_reason(admin_client, shop):
    response = admin_client.post(reverse('admin-product-hide', args=[shop['cabbage'].pk]), {}, format='json')

    assert response.status_code == 400
    assert 'reason' in response.data['errors']


@pytest.mark.django_db
def test_reviews_of_both_tables_share_one_page(admin_client, shop):
    first = completed_order(shop, make_customer(full_name='Nguyễn Văn An'))
    second = completed_order(shop, make_customer('b@test.com', full_name='Trần Bình', phone='0912345678'))
    farmer_review = FarmerReview.objects.create(order=first, rating=5, comment='Rau tươi')
    product_review = ProductReview.objects.create(order_item=second.items.get(), rating=2, is_hidden_by_admin=True)
    # Newest first across both tables.
    FarmerReview.objects.filter(pk=farmer_review.pk).update(created_at=product_review.created_at - timedelta(hours=1))

    data = admin_client.get(REVIEWS_URL).data['data']

    assert data['count'] == 2
    newest, oldest = data['results']
    assert (newest['type'], newest['id'], oldest['type'], oldest['id']) == (
        'PRODUCT', product_review.pk, 'FARMER', farmer_review.pk)
    assert set(newest) == {'id', 'type', 'rating', 'comment', 'customer_display_name', 'product', 'order_id',
                           'reply', 'replied_at', 'is_hidden_by_admin', 'hidden_reason', 'created_at'}
    assert newest['product'] == {'id': shop['cabbage'].pk, 'name': 'Cải ngọt'}
    assert (newest['order_id'], newest['customer_display_name']) == (second.pk, 'Trần B.')
    assert (oldest['product'], oldest['customer_display_name']) == (None, 'Nguyễn V. A.')


@pytest.mark.django_db
def test_review_filters(admin_client, shop):
    FarmerReview.objects.create(order=completed_order(shop), rating=1)
    ProductReview.objects.create(order_item=completed_order(shop, make_customer('c@test.com')).items.get(),
                                 rating=1, is_hidden_by_admin=True)
    ProductReview.objects.create(order_item=completed_order(shop, make_customer('d@test.com')).items.get(), rating=5)

    def kinds(**params):
        rows = admin_client.get(REVIEWS_URL, params).data['data']['results']
        return sorted((row['type'], row['rating']) for row in rows)

    assert kinds(type='product') == [('PRODUCT', 1), ('PRODUCT', 5)]
    assert kinds(rating=1) == [('FARMER', 1), ('PRODUCT', 1)]
    assert kinds(is_hidden='true') == [('PRODUCT', 1)]
    assert kinds(type='FARMER', rating=5) == []
    bad = admin_client.get(REVIEWS_URL, {'type': 'SHOP', 'rating': 9})
    assert set(bad.data['errors']) == {'type', 'rating'}


@pytest.mark.django_db
@pytest.mark.parametrize('prefix', ['farmer-reviews', 'product-reviews'])
def test_hide_and_restore_review(admin_client, shop, prefix):
    order = completed_order(shop)
    review = (FarmerReview.objects.create(order=order, rating=1) if prefix == 'farmer-reviews'
              else ProductReview.objects.create(order_item=order.items.get(), rating=1))

    hidden = admin_client.post(reverse(f'admin-{prefix}-hide', args=[review.pk]), REASON, format='json')
    assert (hidden.data['data']['is_hidden_by_admin'], hidden.data['data']['hidden_reason']) == (
        True, REASON['reason'])

    restored = admin_client.post(reverse(f'admin-{prefix}-restore', args=[review.pk]))
    assert restored.data['data']['is_hidden_by_admin'] is False

    entry = AuditLog.objects.get(action=AuditAction.REVIEW_HIDDEN)
    assert entry.details['review_id'] == review.pk


@pytest.mark.django_db
def test_review_ids_are_per_table(admin_client, shop):
    review = FarmerReview.objects.create(order=completed_order(shop), rating=3)

    response = admin_client.post(reverse('admin-product-reviews-hide', args=[review.pk]), REASON, format='json')

    assert response.status_code == 404


@pytest.mark.parametrize('full_name, short', [
    ('Nguyễn Văn A', 'Nguyễn V. A.'), ('Lan', 'Lan'), ('', 'Customer'), ('  Trần   Thị  Bích  ', 'Trần T. B.'),
])
def test_short_customer_name(full_name, short):
    assert short_customer_name(full_name) == short
