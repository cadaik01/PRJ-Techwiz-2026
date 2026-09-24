from rest_framework_simplejwt.tokens import RefreshToken


def issue_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    # Claims set on the refresh token are copied into every access token derived from it.
    refresh["role"] = user.role.code
    refresh["must_change_password"] = user.must_change_password
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
