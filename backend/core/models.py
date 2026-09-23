"""
Module: core.models
Description: Abstract bases shared by every business model.
"""

from django.db import models


class BaseModel(models.Model):
    """Timestamps shared by every business entity. The primary key is left to Django."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class HistoryRequestMeta(models.Model):
    """Adds request_id to django-simple-history tables.

    Use as `HistoricalRecords(table_name="[entity]_histories", bases=[HistoryRequestMeta])`;
    core.signals fills the value.
    """

    request_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    class Meta:
        abstract = True
