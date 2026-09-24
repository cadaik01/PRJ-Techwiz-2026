"""Customer management (FR-52, AD-09 -> AD-13, D-015, Pass 4B §5.4)."""

import pytest
from django.core import mail
from django.urls import reverse

from favorites.models import FavoriteProduct
from manager.conftest import make_customer, make_farmer, make_market, make_order, make_product
from notifications.models import Notification, NotificationType
from orders.models import ActorRole, ChangeReason, OrderStatus, OrderStatusHistory, Transition
from system.models import AuditAction, AuditLog

LIST_URL = reverse('admin-customer-list')


def url(name, customer):
    return reverse(f'admin-customer-{name}', args=[customer.pk])


@pytest.fixture
def shop(db):
    farmer = make_farmer()
    return {'farmer': farmer, 'market': make_market(), 'cabbage': make_product(farmer, stock=5)}


@pytest.fixture
def customer(db):
    return make_customer()


@pytest.mark.django_db
def test_customer_is_refused(auth_client):
    assert auth_client.get(LIST_URL).status_code == 403


@pytest.mark.django_db
def test_list_rows_and_counts(admin_client, customer, shop):
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)])
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)], status=OrderStatus.NO_SHOW)
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)], status=OrderStatus.COMPLETED)

    data = admin_client.get(LIST_URL).data['data']

    assert data['count'] == 1                                      # farmer and admin accounts are not listed
    row = data['results'][0]
    assert set(row) == {'id', 'full_name', 'email', 'phone', 'date_joined', 'is_active',
                        'total_orders', 'open_orders', 'no_show_count'}
    assert (row['full_name'], row['phone'], row['is_active']) == ('Nguyễn Văn A', '0901234567', True)
    assert (row['total_orders'], row['open_orders'], row['no_show_count']) == (3, 1, 1)


@pytest.mark.django_db
def test_list_search_and_status_filter(admin_client, customer):
    make_customer('binh@test.com', full_name='Trần Thị Bình', phone='0987654321', is_active=False)

    def emails(**params):
        return [row['email'] for row in admin_client.get(LIST_URL, params).data['data']['results']]

    assert emails(q='binh') == ['binh@test.com']                   # accent-insensitive name match
    assert emails(q='0901') == ['khach@test.com']
    assert emails(is_active='false') == ['binh@test.com']


@pytest.mark.django_db
def test_detail_has_address_and_recent_order_summaries(admin_client, customer, shop):
    for _ in range(11):
        make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 2)])

    data = admin_client.get(url('detail', customer)).json()['data']

    assert data['address'] == '12 Lê Lợi, Quận 1'
    assert len(data['recent_orders']) == 10
    summary = data['recent_orders'][0]
    assert set(summary) == {
        'id', 'status', 'is_overdue', 'version', 'customer', 'farmer', 'market', 'stall_label',
        'pickup_date', 'pickup_start_at', 'pickup_end_at', 'cutoff_at', 'item_count', 'total_amount', 'created_at',
    }
    assert (summary['item_count'], summary['total_amount'], summary['is_overdue']) == (1, 30000, False)
    assert summary['farmer'] == {'id': shop['farmer'].pk, 'stall_name': 'Rau Sạch Đà Lạt', 'phone': '0907654321'}
    assert summary['market']['latitude'] == 10.77245


@pytest.mark.django_db
def test_other_roles_are_404_on_customer_endpoints(admin_client, shop, admin_user):
    assert admin_client.get(url('detail', shop['farmer'].user)).status_code == 404
    assert admin_client.post(url('deactivate', admin_user), {'reason': 'Vi phạm quy định'}).status_code == 404


@pytest.mark.django_db
def test_deactivation_impact(admin_client, customer, shop):
    other_farmer = make_farmer('f2@test.com', stall_name='Trái Cây Miền Tây')
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)])
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)], status=OrderStatus.READY_FOR_PICKUP)
    make_order(customer, other_farmer, shop['market'], [(make_product(other_farmer), 1)],
               status=OrderStatus.ACCEPTED)
    make_order(customer, shop['farmer'], shop['market'], [(shop['cabbage'], 1)], status=OrderStatus.COMPLETED)

    data = admin_client.get(url('deactivation-impact', customer)).data['data']

    assert data == {
        'open_orders': {'PLACED': 1, 'ACCEPTED': 1, 'READY_FOR_PICKUP': 1, 'total': 3},
        'affected_farmers': 2,
    }


@pytest.mark.django_db(transaction=True)
def test_deactivate_cancels_open_orders_restocks_and_notifies(admin_client, admin_user, customer, shop):
    cabbage = shop['cabbage']
    placed = make_order(customer, shop['farmer'], shop['market'], [(cabbage, 2)])
    accepted = make_order(customer, shop['farmer'], shop['market'], [(cabbage, 1)], status=OrderStatus.ACCEPTED)
    ready = make_order(customer, shop['farmer'], shop['market'], [(cabbage, 3)],
                       status=OrderStatus.READY_FOR_PICKUP)
    done = make_order(customer, shop['farmer'], shop['market'], [(cabbage, 4)], status=OrderStatus.COMPLETED)

    response = admin_client.post(url('deactivate', customer), {'reason': 'Bom hàng nhiều lần'}, format='json')

    assert response.status_code == 200
    assert (response.data['data']['affected_orders'], response.data['data']['is_active']) == (3, False)
    customer.refresh_from_db()
    assert customer.is_active is False

    for order, transition in ((placed, Transition.T5), (accepted, Transition.T6), (ready, Transition.T13)):
        order.refresh_from_db()
        assert (order.status, order.version) == (OrderStatus.CANCELLED, 2)
        entry = OrderStatusHistory.objects.get(order=order)
        assert (entry.transition, entry.actor, entry.actor_role, entry.change_reason) == (
            transition, admin_user, ActorRole.ADMIN, ChangeReason.CUSTOMER_LOCKED_BY_ADMIN,
        )
    done.refresh_from_db()
    assert done.status == OrderStatus.COMPLETED

    cabbage.refresh_from_db()
    assert cabbage.stock_quantity == 5 + 2 + 1 + 3

    farmer_user = shop['farmer'].user
    notices = Notification.objects.filter(recipient=farmer_user, type=NotificationType.ORDER_CANCELLED_CUSTOMER_LOCKED)
    assert notices.count() == 3
    assert sorted(message.to[0] for message in mail.outbox) == [farmer_user.email] * 3
    assert {message.subject for message in mail.outbox} == {
        f'Đơn #{order.pk} đã bị hủy' for order in (placed, accepted, ready)
    }
    assert 'bán lẻ' in mail.outbox[0].body and mail.outbox[0].alternatives

    entry = AuditLog.objects.get(action=AuditAction.CUSTOMER_DEACTIVATED)
    assert (entry.user, entry.status_code) == (admin_user, 200)
    assert entry.details == {'customer_id': customer.pk, 'reason': 'Bom hàng nhiều lần', 'affected_orders': 3}


@pytest.mark.django_db(transaction=True)
def test_restock_alert_when_stock_comes_back_from_zero(admin_client, customer, shop):
    cabbage = shop['cabbage']
    cabbage.stock_quantity = 0
    cabbage.save()
    fan = make_customer('fan@test.com', full_name='Lê Văn C')
    FavoriteProduct.objects.create(customer=fan, product=cabbage)
    make_order(customer, shop['farmer'], shop['market'], [(cabbage, 2)])

    admin_client.post(url('deactivate', customer), {'reason': 'Bom hàng nhiều lần'}, format='json')

    alert = Notification.objects.get(recipient=fan)
    assert (alert.type, alert.target_url) == (NotificationType.RESTOCK, f'/products/{cabbage.pk}')


@pytest.mark.django_db
def test_deactivating_twice_is_an_invalid_transition_and_still_audited(admin_client, customer):
    admin_client.post(url('deactivate', customer), {'reason': 'Bom hàng nhiều lần'}, format='json')

    again = admin_client.post(url('deactivate', customer), {'reason': 'Bom hàng nhiều lần'}, format='json')

    assert (again.status_code, again.data['code']) == (400, 'INVALID_STATUS_TRANSITION')
    failed = AuditLog.objects.filter(action=AuditAction.CUSTOMER_DEACTIVATED, status_code=400).get()
    assert failed.details['error'] == 'INVALID_STATUS_TRANSITION'


@pytest.mark.django_db
@pytest.mark.parametrize('body', [{}, {'reason': 'ngắn'}, {'reason': 'x' * 501}])
def test_deactivate_requires_a_5_to_500_character_reason(admin_client, customer, body):
    response = admin_client.post(url('deactivate', customer), body, format='json')

    assert response.status_code == 400
    assert response.data['errors']['reason'] == ['Vui lòng nhập lý do (5–500 ký tự)']
    customer.refresh_from_db()
    assert customer.is_active is True


@pytest.mark.django_db
def test_activate(admin_client, customer):
    assert admin_client.post(url('activate', customer)).data['code'] == 'INVALID_STATUS_TRANSITION'

    customer.is_active = False
    customer.save()
    response = admin_client.post(url('activate', customer))

    assert (response.status_code, response.data['data']['is_active']) == (200, True)
    assert AuditLog.objects.filter(action=AuditAction.CUSTOMER_ACTIVATED, status_code=200).exists()
