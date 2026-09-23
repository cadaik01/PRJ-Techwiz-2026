"""
Module: system.apps
Description: AppConfig for the security audit subsystem.
"""

from django.apps import AppConfig


class SystemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'system'
