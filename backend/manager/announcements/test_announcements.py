"""Site-wide announcements: admin CRUD (FR-57, AD-27, AD-28) and the public feed (PU-13)."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role
from conftest import PASSWORD
from core.policies.roles import RoleCode
from notifications.models import Announcement, AnnouncementAudience

User = get_user_model()

LIST_URL = reverse('admin-announcement-list')
PUBLIC_URL = reverse('public-announcement-list')


def detail_url(announcement):
    return reverse('admin-announcement-detail', args=[announcement.pk])


def make(title='Chợ nghỉ Tết', audience=AnnouncementAudience.ALL, starts=-1, ends=None, **extra):
    now = timezone.now()
    return Announcement.objects.create(
        title=title, content='Nội dung', audience=audience, starts_at=now + timedelta(hours=starts),
        ends_at=None if ends is None else now + timedelta(hours=ends), **extra,
    )


def payload(**overrides):
    starts = timezone.now()
    return {
        'title': 'Bảo trì hệ thống', 'content': 'Hệ thống bảo trì 22h–23h', 'audience': 'ALL',
        'starts_at': starts.isoformat(), 'ends_at': (starts + timedelta(days=1)).isoformat(), **overrides,
    }


@pytest.mark.django_db
def test_customer_is_refused(auth_client):
    assert auth_client.post(LIST_URL, payload(), format='json').status_code == 403


@pytest.mark.django_db
def test_create_returns_announcement_admin(admin_client, admin_user):
    response = admin_client.post(LIST_URL, payload(), format='json')

    assert response.status_code == 201
    data = response.data['data']
    assert set(data) == {
        'id', 'title', 'content', 'audience', 'starts_at', 'ends_at',
        'is_active', 'created_by_name', 'created_at', 'updated_at',
    }
    assert (data['is_active'], data['created_by_name']) == (True, admin_user.email)
    assert data['starts_at'].endswith('+07:00')


@pytest.mark.django_db
@pytest.mark.parametrize('field, value, message', [
    ('title', 'Tết', 'Tiêu đề từ 5–150 ký tự'),
    ('content', '', 'Vui lòng nhập nội dung'),
    ('content', 'x' * 1001, 'Nội dung tối đa 1.000 ký tự'),
    ('audience', 'ADMIN', 'Đối tượng không hợp lệ'),
])
def test_create_validation(admin_client, field, value, message):
    response = admin_client.post(LIST_URL, payload(**{field: value}), format='json')

    assert response.status_code == 400
    assert response.data['errors'][field] == [message]


@pytest.mark.django_db
def test_ends_at_must_follow_starts_at(admin_client):
    now = timezone.now().isoformat()

    response = admin_client.post(LIST_URL, payload(starts_at=now, ends_at=now), format='json')

    assert response.data['errors']['ends_at'] == ['Thời điểm kết thúc phải sau thời điểm bắt đầu']


@pytest.mark.django_db
def test_list_is_paginated_newest_first(admin_client):
    make('Cũ hơn', starts=-5)
    make('Mới hơn', starts=-1, is_active=False)

    data = admin_client.get(LIST_URL).data['data']

    assert (data['count'], data['total_pages']) == (2, 1)
    assert [row['title'] for row in data['results']] == ['Mới hơn', 'Cũ hơn']


@pytest.mark.django_db
def test_patch_checks_dates_against_stored_row_and_can_turn_off(admin_client):
    announcement = make(ends=5)

    bad = admin_client.patch(detail_url(announcement), {'starts_at': (timezone.now() + timedelta(hours=6)).isoformat()},
                             format='json')
    assert bad.status_code == 400

    ok = admin_client.patch(detail_url(announcement), {'is_active': False}, format='json')
    assert (ok.status_code, ok.data['data']['is_active']) == (200, False)


@pytest.mark.django_db
def test_delete_is_204_and_unknown_is_404(admin_client):
    announcement = make()

    assert admin_client.delete(detail_url(announcement)).status_code == 204
    assert admin_client.delete(detail_url(announcement)).status_code == 404


@pytest.mark.django_db
def test_public_feed_shows_only_live_announcements_for_guests(api_client):
    make('Đang hiệu lực', ends=3)
    make('Không hạn', starts=-10)
    make('Chưa bắt đầu', starts=2)
    make('Đã kết thúc', starts=-5, ends=-1)
    make('Đã tắt', is_active=False)
    make('Riêng khách hàng', audience=AnnouncementAudience.CUSTOMER)

    response = api_client.get(PUBLIC_URL)

    assert response.status_code == 200
    assert [row['title'] for row in response.data['data']] == ['Đang hiệu lực', 'Không hạn']
    assert set(response.data['data'][0]) == {'id', 'title', 'content', 'audience', 'starts_at', 'ends_at'}


@pytest.mark.django_db
def test_public_feed_adds_the_signed_in_role_audience(auth_client):
    make('Tất cả')
    make('Riêng khách hàng', audience=AnnouncementAudience.CUSTOMER)
    make('Riêng nông dân', audience=AnnouncementAudience.FARMER)

    customer_titles = {row['title'] for row in auth_client.get(PUBLIC_URL).data['data']}

    farmer_role = Role.objects.get_or_create(code=RoleCode.FARMER, defaults={'name': 'Nông dân'})[0]
    farmer = User.objects.create_user(email='farmer@test.com', password=PASSWORD, role=farmer_role)
    farmer_client = APIClient()
    farmer_client.force_authenticate(user=farmer)
    farmer_titles = {row['title'] for row in farmer_client.get(PUBLIC_URL).data['data']}

    assert customer_titles == {'Tất cả', 'Riêng khách hàng'}
    assert farmer_titles == {'Tất cả', 'Riêng nông dân'}
