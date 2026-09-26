import pytest

from favorites.models import FavoriteProduct
from favorites.selectors import get_restock_subscribers
from tests_support.factories import make_customer, make_farmer, make_product


@pytest.mark.django_db
class TestRestockSubscribers:
    def test_returns_active_customers_who_favorited_the_product(self):
        product = make_product(farmer=make_farmer(), stock=0)
        fan, locked_fan, stranger = make_customer(), make_customer(is_active=False), make_customer()
        FavoriteProduct.objects.create(customer=fan, product=product)
        FavoriteProduct.objects.create(customer=locked_fan, product=product)
        FavoriteProduct.objects.create(customer=stranger, product=make_product(farmer=product.farmer))

        subscribers = get_restock_subscribers(product.pk)

        assert list(subscribers) == [fan]

    def test_nobody_favorited(self):
        assert list(get_restock_subscribers(make_product(farmer=make_farmer()).pk)) == []
