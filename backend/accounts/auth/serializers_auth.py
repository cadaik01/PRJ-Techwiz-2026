from typing import Any

from rest_framework import serializers

from accounts.auth.serializers_common import check_password_strength
from accounts.farmer.serializers_farmer import validate_operating_days_field, validate_vn_phone


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
        # Same rule as AU-01 (§1.5 plus Django's password validators).
        return check_password_strength(value)

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
