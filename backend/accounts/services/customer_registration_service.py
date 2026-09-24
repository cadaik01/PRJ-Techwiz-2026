from django.db import IntegrityError, transaction

from accounts.exceptions import EmailExistsError
from accounts.models import CustomerProfile, CustomUser, Role
from marketlink_core.policies.roles import RoleCode


def _email_exists_error() -> EmailExistsError:
    return EmailExistsError(errors={"email": [EmailExistsError.default_detail]})


def register_customer(*, email: str, password: str, full_name: str, phone: str, address: str) -> CustomUser:
    if CustomUser.objects.filter(email=email).exists():
        raise _email_exists_error()

    role = Role.objects.get(code=RoleCode.CUSTOMER)
    try:
        with transaction.atomic():
            user = CustomUser.objects.create_user(email=email, password=password, role=role)
            CustomerProfile.objects.create(user=user, full_name=full_name, phone=phone, address=address)
    except IntegrityError as exc:
        # Two concurrent sign-ups with the same email: the unique index decides the loser.
        raise _email_exists_error() from exc
    return user
