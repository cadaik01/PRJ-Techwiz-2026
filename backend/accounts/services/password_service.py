"""
Module: accounts.services.password_service
Description: Password change logic.
"""

from django.contrib.auth.password_validation import validate_password
from django.db import transaction


@transaction.atomic
def change_password(*, user, new_password):
    """Validate and store a new password, clearing the forced-change flag."""
    validate_password(new_password, user)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=['password', 'must_change_password'])
    return user
