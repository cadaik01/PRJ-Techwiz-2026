"""
Module: catalog.apps
Description: AppConfig for categories and products.
"""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'catalog'
