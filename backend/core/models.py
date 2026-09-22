"""
Module: core.models
Description: Abstract base every business model inherits.
"""

from django.db import models


class BaseModel(models.Model):
    """Timestamps shared by every business entity.

    Deliberately holds nothing else: the primary key is left to Django unless a
    child model declares its own.
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
