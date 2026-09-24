"""Farmer management (FR-51, AD-02 -> AD-08, D-015, Pass 4B §5.4, CT-13)."""

from datetime import time

import pytest
from django.core import mail
from django.urls import reverse

from accounts.models import FarmerStatus
from manager.conftest import make_customer, make_farmer, make_market, make_order, make_product
from markets.models import FarmerMarket, PickupSlot
from notifications.models import Notification, NotificationType
from orders.models import ActorRole, ChangeReason, OrderStatus, OrderStatusHistory, Transition
from reviews.models import FarmerReview, ProductReview
from system.models import AuditAction, AuditLog

LIST_URL = reverse('admin-farmer-list')
REASON = {'reason': 'Bán hàng không đúng mô tả'}


def url(name, farmer):
    return reverse(f'admin-farmer-{name}', args=[farmer.pk])


@pytest.fixture
def farmer(db):
    return make_farmer()


@pytest.fixture
def market(db):
    return make_market()


@pytest.mark.django_db
def test_customer_is_refused(auth_client):
    assert auth_client.get(LIST_URL).status_code == 403


@pytest.mark.django_db
def test_list_row_and_counts(admin_client, farmer, market):
    customer = make_customer()
    cabbage = make_product(farmer)
    archived = make_product(farmer, name='Cũ')
    archived.is_archived = True
    archived.save()
    make_order(customer, farmer, market, [(cabbage, 1)])
    make_order(customer, farmer, market, [(cabbage, 1)], status=OrderStatus.COMPLETED)

    row = admin_client.get(LIST_URL).data['data']['results'][0]

    assert set(row) == {'id', 'stall_name', 'contact_person', 'phone', 'email', 'status', 'date_joined',
                        'product_count', 'open_order_count'}
    assert (row['id'], row['email'], row['status']) == (farmer.user_id, 'farmer@test.com', 'APPROVED')
    assert (row['product_count'], row['open_order_count']) == (1, 1)


@pytest.mark.django_db
def test_list_filters(admin_client, farmer, market):
    pending = make_farmer('cho@test.com', stall_name='Nấm Sạch', status=FarmerStatus.PENDING)
    make_farmer('bi@test.com', stall_name='Trái Cây', status=FarmerStatus.SUSPENDED)
    FarmerMarket.objects.create(farmer=pending, market=market)

    def names(**params):
        return [row['stall_name'] for row in admin_client.get(LIST_URL, params).data['data']['results']]

    assert names(status='PENDING') == ['Nấm Sạch']
    assert set(names(status='approved,suspended')) == {'Rau Sạch Đà Lạt', 'Trái Cây'}
    assert names(q='nam sach') == ['Nấm Sạch']
    assert names(q='bi@test') == ['Trái Cây']
    assert names(market_id=market.pk) == ['Nấm Sạch']
    assert admin_client.get(LIST_URL, {'status': 'ACTIVE'}).status_code == 400


@pytest.mark.django_db
def test_detail_is_farmer_public_plus_admin_fields(admin_client, farmer, market):
    customer = make_customer()
    farmer_market = FarmerMarket.objects.create(farmer=farmer, market=market, stall_label='Sạp B12')
    PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=6, start_time=time(6), end_time=time(8))
    PickupSlot.objects.create(farmer_market=farmer_market, day_of_week=7, start_time=time(6), end_time=time(8),
                              is_active=False)
    cabbage = make_product(farmer, stock=4)
    held = make_order(customer, farmer, market, [(cabbage, 3)])
    done = make_order(customer, farmer, market, [(cabbage, 1)], status=OrderStatus.COMPLETED)
    FarmerReview.objects.create(order=done, rating=4)
    FarmerReview.objects.create(order=held, rating=1, is_hidden_by_admin=True)   # hidden: not counted
    ProductReview.objects.create(order_item=done.items.get(), rating=5)

    data = admin_client.get(url('detail', farmer)).json()['data']

    assert (data['id'], data['email'], data['status'], data['status_reason']) == (
        farmer.pk, 'farmer@test.com', 'APPROVED', None)
    assert (data['rating_avg'], data['rating_count'], data['in_stock_product_count']) == (4.0, 1, 1)
    assert data['markets'] == [{'market_id': market.pk, 'market_name': 'Chợ Bến Thành', 'stall_label': 'Sạp B12'}]
    assert data['operating_days'] == [6]
    window = data['pickup_windows'][0]
    assert [(slot['day_of_week'], slot['start_time'], slot['is_active']) for slot in window['slots']] == [
        (6, '06:00', True), (7, '06:00', False)]
    assert data['order_stats'] == {'total': 2, 'completed': 1, 'declined': 0, 'expired': 0, 'no_show': 0}

    product = data['products'][0]
    assert (product['held_quantity'], product['availability'], product['rating_avg']) == (3, 'IN_STOCK', 5.0)
    assert product['markets'] == [{'market_id': market.pk, 'market_name': 'Chợ Bến Thành', 'days': [6]}]
    assert {'weekly_default_quantity', 'is_archived', 'is_hidden_by_admin', 'hidden_reason',
            'category', 'farmer', 'price', 'unit'} <= set(product)


@pytest.mark.django_db
def test_approve_and_reject_only_from_pending(admin_client, admin_user):
    applicant = make_farmer('moi@test.com', status=FarmerStatus.PENDING)

    approved = admin_client.post(url('approve', applicant))
    assert (approved.status_code, approved.data['data']['status']) == (200, 'APPROVED')
    assert admin_client.post(url('reject', applicant), REASON, format='json').data['code'] == \
        'INVALID_STATUS_TRANSITION'

    notice = Notification.objects.get(recipient=applicant.user)
    assert (notice.type, notice.title) == (NotificationType.ACCOUNT_STATUS_CHANGED, 'Tài khoản đã được duyệt')
    assert AuditLog.objects.filter(action=AuditAction.FARMER_APPROVED, status_code=200, user=admin_user).exists()
    assert AuditLog.objects.filter(action=AuditAction.FARMER_REJECTED, status_code=400).exists()


@pytest.mark.django_db
def test_reject_stores_reason_and_history(admin_client, admin_user):
    applicant = make_farmer('moi@test.com', status=FarmerStatus.PENDING)

    response = admin_client.post(url('reject', applicant), REASON, format='json')

    assert response.data['data']['status'] == 'REJECTED'
    applicant.refresh_from_db()
    assert applicant.status_reason == REASON['reason']
    history = admin_client.get(url('detail', applicant)).data['data']['status_history']
    assert [(h['from_status'], h['to_status'], h['reason'], h['changed_by']) for h in history] == [
        (None, 'PENDING', None, None),
        ('PENDING', 'REJECTED', REASON['reason'], admin_user.email),
    ]


@pytest.mark.django_db
@pytest.mark.parametrize('action', ['reject', 'suspend'])
def test_reason_is_required(admin_client, farmer, action):
    response = admin_client.post(url(action, farmer), {'reason': 'x'}, format='json')

    assert response.data['errors']['reason'] == ['Vui lòng nhập lý do (5–500 ký tự)']


@pytest.mark.django_db
def test_suspension_impact(admin_client, farmer, market):
    cabbage = make_product(farmer)
    alice, bob = make_customer(), make_customer('bob@test.com', phone='0912345678')
    make_order(alice, farmer, market, [(cabbage, 1)])
    make_order(bob, farmer, market, [(cabbage, 1)], status=OrderStatus.READY_FOR_PICKUP)

    data = admin_client.get(url('suspension-impact', farmer)).data['data']

    assert data == {'open_orders': {'PLACED': 1, 'ACCEPTED': 0, 'READY_FOR_PICKUP': 1, 'total': 2},
                    'affected_customers': 2}


@pytest.mark.django_db(transaction=True)
def test_suspend_declines_open_orders_restocks_and_notifies(admin_client, admin_user, farmer, market):
    # CT-13: a READY_FOR_PICKUP order is declined through T12, stock comes back, the customer gets an email.
    customer = make_customer()
    cabbage = make_product(farmer, stock=2)
    placed = make_order(customer, farmer, market, [(cabbage, 1)])
    accepted = make_order(customer, farmer, market, [(cabbage, 2)], status=OrderStatus.ACCEPTED)
    ready = make_order(customer, farmer, market, [(cabbage, 4)], status=OrderStatus.READY_FOR_PICKUP)

    response = admin_client.post(url('suspend', farmer), REASON, format='json')

    assert response.status_code == 200
    assert (response.data['data']['status'], response.data['data']['affected_orders']) == ('SUSPENDED', 3)
    for order, transition in ((placed, Transition.T3), (accepted, Transition.T4), (ready, Transition.T12)):
        order.refresh_from_db()
        assert (order.status, order.version) == (OrderStatus.DECLINED, 2)
        entry = OrderStatusHistory.objects.get(order=order)
        assert (entry.transition, entry.actor, entry.actor_role, entry.change_reason) == (
            transition, admin_user, ActorRole.ADMIN, ChangeReason.FARMER_SUSPENDED_BY_ADMIN)
    cabbage.refresh_from_db()
    assert cabbage.stock_quantity == 2 + 1 + 2 + 4

    declined = Notification.objects.filter(recipient=customer, type=NotificationType.ORDER_DECLINED)
    assert declined.count() == 3
    assert [message.to for message in mail.outbox] == [[customer.email]] * 3
    assert REASON['reason'] not in mail.outbox[0].body          # the admin's reason is not shown to customers
    assert Notification.objects.filter(recipient=farmer.user, type=NotificationType.ACCOUNT_STATUS_CHANGED).exists()

    entry = AuditLog.objects.get(action=AuditAction.FARMER_SUSPENDED)
    assert entry.details == {'farmer_id': farmer.pk, 'reason': REASON['reason'], 'affected_orders': 3}


@pytest.mark.django_db
def test_suspend_only_from_approved_and_reinstate_only_from_suspended(admin_client, farmer):
    assert admin_client.post(url('reinstate', farmer)).data['code'] == 'INVALID_STATUS_TRANSITION'
    assert admin_client.post(url('suspend', farmer), REASON, format='json').status_code == 200
    assert admin_client.post(url('suspend', farmer), REASON, format='json').data['code'] == \
        'INVALID_STATUS_TRANSITION'

    reinstated = admin_client.post(url('reinstate', farmer))

    assert reinstated.data['data']['status'] == 'APPROVED'
    farmer.refresh_from_db()
    assert farmer.status_reason is None
    assert Notification.objects.filter(recipient=farmer.user, title='Tài khoản đã được khôi phục').exists()


@pytest.mark.django_db
def test_unknown_farmer_is_404(admin_client, user):
    assert admin_client.post(reverse('admin-farmer-approve', args=[user.pk])).status_code == 404
