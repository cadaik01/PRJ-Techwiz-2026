"""
Module: accounts.auth.serializers_auth
Description: Serializers for the authentication endpoints.

Read and write shapes are separate: a write serializer that borrowed the read
fields would eventually let a client submit `is_staff`.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserReadSerializer(serializers.ModelSerializer):
    """Profile returned after login and from /me/."""

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'avatar',
                  'is_staff', 'is_superuser', 'must_change_password')
        read_only_fields = fields


class LoginWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class RefreshWriteSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordWriteSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
