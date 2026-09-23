"""
Module: accounts.auth.serializers_auth
Description: Serializers for the authentication endpoints. Read and write shapes are
             separate so a write can never accept fields such as is_staff.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import normalize_email_address

User = get_user_model()


class UserReadSerializer(serializers.ModelSerializer):
    """Profile returned after login and from /me/."""

    role = serializers.SlugRelatedField(slug_field='code', read_only=True)
    full_name = serializers.CharField(source='profile.full_name', read_only=True, default='')
    phone = serializers.CharField(source='profile.phone', read_only=True, default='')
    avatar = serializers.ImageField(source='profile.avatar', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'full_name', 'phone', 'avatar',
            'must_change_password', 'is_active', 'created_at',
        ]
        read_only_fields = fields


class LoginWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return normalize_email_address(value)


class RefreshWriteSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LogoutWriteSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)


class ChangePasswordWriteSerializer(serializers.Serializer):
    """Needs the request in context: both checks are against the caller's account."""

    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Incorrect password.')
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value
