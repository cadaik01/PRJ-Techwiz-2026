"""
Module: reviews.apps
Description: AppConfig for product and farmer reviews.
"""

from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reviews'
