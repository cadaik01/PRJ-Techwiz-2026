"""
Module: notifications.admin
Description: Django admin registration for notifications.
"""

from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('recipient__email', 'title')
    list_select_related = ('recipient',)
