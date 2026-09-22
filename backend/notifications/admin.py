"""
Module: notifications.admin
Description: Django admin registration for notifications.
"""

from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'verb', 'severity', 'is_read', 'created_at')
    list_filter = ('severity', 'is_read', 'verb')
    search_fields = ('recipient__email', 'verb')
