import re
from typing import Any

from rest_framework import serializers

from accounts.farmer.serializers_farmer import validate_operating_days_field, validate_vn_phone
from marketlink_core.policies.roles import RoleCode

# §1.5: at least 8 characters with letters and numbers.
PASSWORD_MIN_LENGTH = 8
PASSWORD_RULE_MESSAGE = "Password must be at least 8 characters and include letters and numbers"
_HAS_LETTER = re.compile(r"[A-Za-z]")
_HAS_DIGIT = re.compile(r"\d")


def build_me(user: Any) -> dict[str, Any]:
    """Me (Pass 4B §3.1). Shared with AU-01, AU-03, AU-06, AU-09 (P2)."""
    role = getattr(getattr(user, "role", None), "code", None)
    display_name = "Administrator"
    farmer_status = None
    if role == RoleCode.FARMER:
        profile = getattr(user, "farmer_profile", None)
        display_name = profile.stall_name if profile else user.email
        farmer_status = profile.status if profile else None
    elif role == RoleCode.CUSTOMER:
        profile = getattr(user, "customer_profile", None)
        display_name = profile.full_name if profile else user.email
    return {
        "id": user.pk,
        "email": user.email,
        "role": role,
        "display_name": display_name,
        "farmer_status": farmer_status,
    }


def validate_password_rule(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH or not _HAS_LETTER.search(password) or not _HAS_DIGIT.search(password):
        raise serializers.ValidationError(PASSWORD_RULE_MESSAGE)
    return password


class FarmerRegisterAuthSerializer(serializers.Serializer):
    """AU-02 body (G-11)."""

    email = serializers.EmailField(max_length=100)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    stall_name = serializers.CharField(min_length=2, max_length=100)
    contact_person = serializers.CharField(min_length=2, max_length=100)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(min_length=5, max_length=255)
    operating_days = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)

    def validate_password(self, value: str) -> str:
        return validate_password_rule(value)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_phone(self, value: str) -> str:
        return validate_vn_phone(value)

    def validate_operating_days(self, value: list[int]) -> list[int]:
        return validate_operating_days_field(value)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match"]})
        return attrs
