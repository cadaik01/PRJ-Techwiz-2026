"""
Module: manager.apps
Description: The admin (manager) back office: every /api/admin/ endpoint lives in this
             app, one sub-package per module, so it merges without touching the
             domain apps it reads from.
"""

from django.apps import AppConfig


class ManagerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'manager'
