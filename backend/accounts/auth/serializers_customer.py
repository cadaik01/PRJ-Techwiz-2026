from rest_framework import serializers

from accounts.auth.serializers_common import check_password_strength, clean_phone


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
        return clean_phone(value)

    def validate_password(self, value: str) -> str:
        return check_password_strength(value)

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match"]})
        return attrs
