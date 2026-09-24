"""
Module: system.serializers
Description: Read-only shape of an audit log row.
"""

from rest_framework import serializers

from system.models import AuditLog


class AuditLogReadSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'endpoint', 'method', 'ip_address',
            'user_agent', 'status_code', 'request_id', 'details', 'created_at',
        ]
        read_only_fields = fields
