"""
Module: manager.audit_logs.serializers_admin
Description: Read-only audit log shape (Pass 4B §3.6 `AuditLog`).
"""

from rest_framework import serializers

from system.models import AuditLog


class AuditLogUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()


class AuditLogReadSerializer(serializers.ModelSerializer):
    user = AuditLogUserSerializer(allow_null=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'endpoint', 'method', 'ip_address',
            'user_agent', 'status_code', 'request_id', 'details', 'created_at',
        ]
        read_only_fields = fields
