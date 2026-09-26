from typing import Any

from rest_framework_simplejwt.tokens import RefreshToken


def issue_token_pair(user: Any) -> dict[str, str]:
    """JWT pair for AU-01 / AU-02 / AU-03 responses: { access, refresh }."""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
