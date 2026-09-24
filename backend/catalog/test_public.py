"""Public catalog endpoints (Pass 4B §4.2)."""

import pytest
from django.urls import reverse

from catalog.models import Category


@pytest.mark.django_db
def test_public_category_list_is_open_and_shows_only_active_categories(api_client):
    vegetables = Category.objects.create(name='Rau lá', icon='Leaf', display_order=2)
    fruits = Category.objects.create(name='Trái cây', icon='Apple', display_order=1)
    Category.objects.create(name='Hạt', is_active=False)

    response = api_client.get(reverse('public-category-list'))

    assert response.status_code == 200
    assert response.data['data'] == [
        {'id': fruits.pk, 'name': 'Trái cây', 'icon': 'Apple', 'display_order': 1},
        {'id': vegetables.pk, 'name': 'Rau lá', 'icon': 'Leaf', 'display_order': 2},
    ]
