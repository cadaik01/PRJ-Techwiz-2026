"""Admin category management (FR-56, AD-18, AD-19)."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from accounts.models import FarmerProfile, Role
from catalog.models import Category, Product, Unit
from conftest import PASSWORD
from core.policies.roles import RoleCode
from system.models import AuditAction, AuditLog

User = get_user_model()

LIST_URL = reverse('admin-category-list')


def detail_url(category):
    return reverse('admin-category-detail', args=[category.pk])


@pytest.fixture
def vegetables(db):
    return Category.objects.create(name='Rau lá', icon='Leaf', display_order=2)


@pytest.fixture
def fruits(db):
    return Category.objects.create(name='Trái cây', icon='Apple', display_order=1)


def add_product(category):
    role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Nông dân'})[0]
    user = User.objects.create_user(email=f'farmer{category.pk}@test.com', password=PASSWORD, role=role)
    farmer = FarmerProfile.objects.create(
        user=user, stall_name='Rau Sạch', contact_person='Bà Tư', phone='0907654321', address='Chợ Bến Thành',
    )
    return Product.objects.create(farmer=farmer, category=category, name='Cải ngọt', price=15000, unit=Unit.BUNCH)


@pytest.mark.django_db
def test_customer_is_refused_and_the_attempt_is_audited(auth_client, user):
    # CT-04 pattern: wrong role on the admin branch is 403 plus one ACCESS_DENIED row.
    response = auth_client.get(LIST_URL)

    assert response.status_code == 403
    assert AuditLog.objects.filter(action=AuditAction.ACCESS_DENIED, user=user, endpoint=LIST_URL).count() == 1


@pytest.mark.django_db
def test_list_shows_every_category_with_product_count(admin_client, vegetables, fruits):
    Category.objects.create(name='Hạt', is_active=False)
    add_product(vegetables)

    response = admin_client.get(LIST_URL)

    assert response.status_code == 200
    rows = response.data['data']
    assert [row['name'] for row in rows] == ['Hạt', 'Trái cây', 'Rau lá']
    assert set(rows[0]) == {'id', 'name', 'icon', 'display_order', 'is_active', 'product_count'}
    assert {row['name']: row['product_count'] for row in rows} == {'Hạt': 0, 'Trái cây': 0, 'Rau lá': 1}


@pytest.mark.django_db
def test_create_returns_201_and_ignores_is_active(admin_client):
    response = admin_client.post(
        LIST_URL, {'name': '  Nấm  ', 'icon': 'Sprout', 'display_order': 3, 'is_active': False}, format='json',
    )

    assert response.status_code == 201
    assert response.data['data'] | {'id': None} == {
        'id': None, 'name': 'Nấm', 'icon': 'Sprout', 'display_order': 3, 'is_active': True, 'product_count': 0,
    }


@pytest.mark.django_db
def test_name_is_unique_ignoring_case_but_not_accents(admin_client, vegetables):
    duplicate = admin_client.post(LIST_URL, {'name': 'RAU LÁ'}, format='json')

    assert duplicate.status_code == 400
    assert duplicate.data['code'] == 'VALIDATION_ERROR'
    assert duplicate.data['errors']['name'] == ['Tên danh mục đã tồn tại']
    assert admin_client.post(LIST_URL, {'name': 'Rau la'}, format='json').status_code == 201


@pytest.mark.django_db
@pytest.mark.parametrize('name', ['', 'A', 'x' * 51])
def test_name_must_be_2_to_50_characters(admin_client, name):
    response = admin_client.post(LIST_URL, {'name': name}, format='json')

    assert response.status_code == 400
    assert response.data['errors']['name'] == ['Vui lòng nhập 2–50 ký tự']


@pytest.mark.django_db
def test_patch_renames_and_hides(admin_client, vegetables):
    response = admin_client.patch(detail_url(vegetables), {'name': 'Rau ăn lá', 'is_active': False}, format='json')

    assert response.status_code == 200
    assert (response.data['data']['name'], response.data['data']['is_active']) == ('Rau ăn lá', False)


@pytest.mark.django_db
def test_patch_keeps_its_own_name_valid(admin_client, vegetables):
    response = admin_client.patch(detail_url(vegetables), {'name': 'Rau lá', 'display_order': 9}, format='json')

    assert response.status_code == 200


@pytest.mark.django_db
def test_delete_is_refused_while_a_product_uses_the_category(admin_client, vegetables):
    add_product(vegetables)

    response = admin_client.delete(detail_url(vegetables))

    assert response.status_code == 422
    assert response.data['code'] == 'RESOURCE_IN_USE'
    assert Category.objects.filter(pk=vegetables.pk).exists()


@pytest.mark.django_db
def test_delete_unused_category_returns_204_without_body(admin_client, vegetables):
    response = admin_client.delete(detail_url(vegetables))

    assert response.status_code == 204
    assert not response.content
    assert not Category.objects.filter(pk=vegetables.pk).exists()


@pytest.mark.django_db
def test_unknown_category_is_404(admin_client):
    response = admin_client.patch(reverse('admin-category-detail', args=[999]), {'name': 'Mới'}, format='json')

    assert response.status_code == 404
    assert response.data['code'] == 'NOT_FOUND'
