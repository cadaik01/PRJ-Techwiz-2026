from accounts.exceptions import AccountLockedError, InvalidCredentialsError
from accounts.models import CustomUser


def authenticate_user(*, email: str, password: str) -> CustomUser:
    user = CustomUser.objects.select_related("role").filter(email=email).first()
    if user is None:
        # Hash anyway so unknown emails take as long as wrong passwords (no user enumeration by timing).
        CustomUser().set_password(password)
        raise InvalidCredentialsError()
    if not user.check_password(password):
        raise InvalidCredentialsError()
    if not user.is_active:
        profile = getattr(user, "customer_profile", None)
        reason = profile.deactivation_reason if profile else None
        raise AccountLockedError(errors={"deactivation_reason": [reason]} if reason else None)
    return user
