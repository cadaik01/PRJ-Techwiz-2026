from rest_framework import serializers

from accounts.auth.serializers_common import clean_phone


class CustomerProfileReadSerializer(serializers.Serializer):
    """Pass 4B §3.1 CustomerProfile."""

    full_name = serializers.CharField()
    phone = serializers.CharField()
    address = serializers.CharField()
    email = serializers.EmailField(source="user.email")


class CustomerProfileWriteSerializer(serializers.Serializer):
    """CU-03: same rules as sign-up (AU-01); email is read-only, so unknown keys are ignored."""

    full_name = serializers.CharField(min_length=2, max_length=100, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    address = serializers.CharField(min_length=5, max_length=255, required=False)

    def validate_phone(self, value: str) -> str:
        return clean_phone(value)
