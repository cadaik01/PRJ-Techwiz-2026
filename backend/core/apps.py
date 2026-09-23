"""
Module: core.apps
Description: AppConfig for the shared core layer.
"""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Without this import the receiver never registers and every history row
        # silently gets request_id = NULL.
        import core.signals  # noqa: F401
