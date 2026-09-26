from datetime import timedelta
from unittest import mock

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.auth.tokens import issue_tokens
from orders.models import OrderStatus
from reviews.display import short_customer_name
from reviews.models import FarmerReview, ProductReview
from tests_support.factories import make_customer, make_farmer, make_order, make_product

REVIEW_KEYS = {"id", "type", "rating", "comment", "customer_display_name", "product", "reply", "replied_at", "created_at"}


def _farmer_url(order) -> str:
    return f"/api/customer/orders/{order.pk}/farmer-review/"


def _item_url(order, item) -> str:
    return f"/api/customer/orders/{order.pk}/items/{item.pk}/review/"


def _post(user, url, body=None):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_tokens(user)['access']}")
    return client.post(url, body if body is not None else {"rating": 5, "comment": "Fresh and friendly"}, format="json")


@pytest.fixture
def customer(db):
    user = make_customer()
    user.customer_profile.full_name = "Nguyen Van An"
    user.customer_profile.save()
    return user


@pytest.fixture
def completed_order(customer):
    past = timezone.now() - timedelta(days=1)
    return make_order(customer=customer, product=make_product(farmer=make_farmer()), status=OrderStatus.COMPLETED,
                      pickup_start_at=past)


@pytest.mark.django_db
class TestFarmerReview:
    def test_creates_review(self, customer, completed_order):
        response = _post(customer, _farmer_url(completed_order))

        assert response.status_code == 201
        data = response.json()["data"]
        assert set(data) == REVIEW_KEYS
        assert (data["type"], data["rating"], data["comment"]) == ("FARMER", 5, "Fresh and friendly")
        assert (data["customer_display_name"], data["product"], data["reply"]) == ("Nguyen V. A.", None, None)
        assert FarmerReview.objects.get(order=completed_order).rating == 5

    def test_comment_is_optional_and_blank_is_stored_as_null(self, customer, completed_order):
        response = _post(customer, _farmer_url(completed_order), {"rating": 4, "comment": "   "})

        assert response.status_code == 201
        assert FarmerReview.objects.get(order=completed_order).comment is None

    @pytest.mark.parametrize("status", [
        OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED, OrderStatus.DECLINED, OrderStatus.NO_SHOW, OrderStatus.EXPIRED,
    ])
    def test_only_completed_orders_can_be_reviewed(self, customer, completed_order, status):
        completed_order.status = status
        completed_order.save()

        response = _post(customer, _farmer_url(completed_order))

        assert (response.status_code, response.json()["code"]) == (422, "REVIEW_NOT_ALLOWED")
        assert not FarmerReview.objects.exists()

    def test_second_review_is_rejected(self, customer, completed_order):
        _post(customer, _farmer_url(completed_order))

        response = _post(customer, _farmer_url(completed_order), {"rating": 1})

        assert (response.status_code, response.json()["code"]) == (422, "REVIEW_NOT_ALLOWED")
        assert FarmerReview.objects.get(order=completed_order).rating == 5

    def test_concurrent_duplicate_is_rejected_by_the_unique_index(self, customer, completed_order):
        _post(customer, _farmer_url(completed_order))

        with mock.patch("reviews.services.review_service._farmer_review_exists", return_value=False):
            response = _post(customer, _farmer_url(completed_order))

        assert (response.status_code, response.json()["code"]) == (422, "REVIEW_NOT_ALLOWED")

    def test_another_customers_order_is_not_found(self, completed_order):
        response = _post(make_customer(), _farmer_url(completed_order))

        assert response.status_code == 404

    def test_farmer_cannot_use_the_customer_endpoint(self, completed_order):
        response = _post(completed_order.farmer.user, _farmer_url(completed_order))

        assert response.status_code == 403


@pytest.mark.django_db
class TestProductReview:
    def test_creates_review(self, customer, completed_order):
        item = completed_order.items.get()

        response = _post(customer, _item_url(completed_order, item), {"rating": 3})

        assert response.status_code == 201
        data = response.json()["data"]
        assert set(data) == REVIEW_KEYS
        assert (data["type"], data["rating"], data["comment"]) == ("PRODUCT", 3, None)
        assert data["product"] == {"id": item.product_id, "name": item.product_name}
        assert ProductReview.objects.get(order_item=item).rating == 3

    def test_second_review_of_the_same_item_is_rejected(self, customer, completed_order):
        item = completed_order.items.get()
        _post(customer, _item_url(completed_order, item))

        response = _post(customer, _item_url(completed_order, item))

        assert (response.status_code, response.json()["code"]) == (422, "REVIEW_NOT_ALLOWED")

    def test_item_from_another_order_is_not_found(self, customer, completed_order):
        other_order = make_order(customer=customer, product=make_product(farmer=make_farmer()),
                                 status=OrderStatus.COMPLETED)

        response = _post(customer, _item_url(completed_order, other_order.items.get()))

        assert response.status_code == 404

    def test_order_not_completed_is_rejected(self, customer, completed_order):
        completed_order.status = OrderStatus.READY_FOR_PICKUP
        completed_order.save()

        response = _post(customer, _item_url(completed_order, completed_order.items.get()))

        assert (response.status_code, response.json()["code"]) == (422, "REVIEW_NOT_ALLOWED")

    def test_farmer_and_product_reviews_are_independent(self, customer, completed_order):
        assert _post(customer, _farmer_url(completed_order)).status_code == 201
        assert _post(customer, _item_url(completed_order, completed_order.items.get())).status_code == 201


@pytest.mark.django_db
class TestReviewValidation:
    @pytest.mark.parametrize("body, field", [
        ({"rating": 0}, "rating"),
        ({"rating": 6}, "rating"),
        ({}, "rating"),
        ({"rating": 5, "comment": "x" * 1001}, "comment"),
    ])
    def test_invalid_input_is_rejected(self, customer, completed_order, body, field):
        response = _post(customer, _farmer_url(completed_order), body)

        assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
        assert field in response.json()["errors"]

    def test_requires_login(self, completed_order):
        assert APIClient().post(_farmer_url(completed_order), {"rating": 5}, format="json").status_code == 401


class TestShortCustomerName:
    @pytest.mark.parametrize("full_name, expected", [
        ("Nguyen Van An", "Nguyen V. A."),
        ("  tran   thi  bich ngoc ", "Tran T. B. N."),
        ("Alice", "Alice"),
        ("", "Customer"),
    ])
    def test_shortens_all_but_the_first_word(self, full_name, expected):
        assert short_customer_name(full_name) == expected
