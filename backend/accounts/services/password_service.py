"""
Module: accounts.services.password_service
Description: Password change logic. The new password is validated by the serializer.
"""

from django.db import transaction


def change_password(*, user, new_password: str):
    """Store a new password and clear the forced-change flag."""
    with transaction.atomic():
        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password', 'updated_at'])
    return user
