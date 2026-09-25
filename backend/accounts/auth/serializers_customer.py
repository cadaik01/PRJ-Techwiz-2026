import re

from rest_framework import serializers

from accounts.auth.serializers_common import PHONE_PATTERN, check_password_strength
from accounts.phone import normalize_phone


class CustomerRegisterWriteSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=100)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)
    full_name = serializers.CharField(min_length=2, max_length=100)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(min_length=5, max_length=255)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_phone(self, value: str) -> str:
        # D-028: "+84 91 234 5678" and "091.234.5678" are the same number; validate and store 0xxxxxxxxx.
        phone = normalize_phone(value)
        if not re.fullmatch(PHONE_PATTERN, phone):
            raise serializers.ValidationError("Invalid phone number")
        return phone

    def validate_password(self, value: str) -> str:
        return check_password_strength(value)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match"]})
        return attrs
