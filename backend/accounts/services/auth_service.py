"""
Module: accounts.services.auth_service
Description: Credential check for the login endpoint.
"""

from django.contrib.auth import authenticate

from accounts.models import normalize_email_address


def authenticate_user(*, email: str, password: str):
    """Return the active user for these credentials, or None.

    Wrong password and unknown address both return None, so the caller cannot
    reveal which one it was.
    """
    user = authenticate(username=normalize_email_address(email), password=password)
    if user is None or not user.is_active:
        return None
    return user
