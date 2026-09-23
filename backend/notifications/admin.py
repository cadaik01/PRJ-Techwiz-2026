"""
Module: notifications.admin
Description: Django admin registration for notifications.
"""

from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'title', 'level', 'is_read', 'created_at')
    list_filter = ('level', 'is_read')
    search_fields = ('recipient__email', 'title')
    list_select_related = ('recipient',)
