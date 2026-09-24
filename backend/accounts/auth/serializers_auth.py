"""
Module: accounts.auth.serializers_auth
Description: Serializers for the authentication endpoints. Read and write shapes are
             separate so a write can never accept fields such as is_staff.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import normalize_email_address
from core.policies.roles import RoleCode

User = get_user_model()


class UserReadSerializer(serializers.ModelSerializer):
    """`Me` schema returned after login and from /me/ (MarketLink Pass 4B §3.1)."""

    ADMIN_DISPLAY_NAME = 'Quản trị viên'

    role = serializers.SlugRelatedField(slug_field='code', read_only=True)
    display_name = serializers.SerializerMethodField()
    farmer_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'must_change_password', 'display_name', 'farmer_status']
        read_only_fields = fields

    def get_display_name(self, user):
        if user.role.code == RoleCode.CUSTOMER and hasattr(user, 'customer_profile'):
            return user.customer_profile.full_name
        if user.role.code == RoleCode.FARMER and hasattr(user, 'farmer_profile'):
            return user.farmer_profile.stall_name
        return self.ADMIN_DISPLAY_NAME if user.role.code == RoleCode.ADMIN else user.email

    def get_farmer_status(self, user):
        if user.role.code == RoleCode.FARMER and hasattr(user, 'farmer_profile'):
            return user.farmer_profile.status
        return None


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
