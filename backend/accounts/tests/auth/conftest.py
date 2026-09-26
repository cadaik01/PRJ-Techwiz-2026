import pytest
from rest_framework.test import APIClient

from accounts.models import CustomUser, FarmerProfile, Role
from accounts.services.customer_registration_service import register_customer

PASSWORD = "Mango2026x"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def customer(db):
    return register_customer(
        email="alice@example.com",
        password=PASSWORD,
        full_name="Alice Nguyen",
        phone="0912345678",
        address="12 Market Street, District 1",
    )


@pytest.fixture
def farmer(db):
    user = CustomUser.objects.create_user(
        email="farmer@example.com", password=PASSWORD, role=Role.objects.get(code="FARMER")
    )
    FarmerProfile.objects.create(
        user=user,
        stall_name="Green Stall",
        contact_person="Bob Tran",
        phone="0987654321",
        address="5 Farm Road, Da Lat",
        operating_days=[1, 2, 3, 4, 5, 6, 7],
    )
    return user


def bearer(access: str) -> dict:
    return {"HTTP_AUTHORIZATION": f"Bearer {access}"}


@pytest.fixture
def admin_user(db):
    return CustomUser.objects.create_user(
        email="admin@example.com", password=PASSWORD, role=Role.objects.get(code="ADMIN")
    )
