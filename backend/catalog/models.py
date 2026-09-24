"""
Module: catalog.models
Description: categories and products (MarketLink Pass 4A §3.3, D-008, D-014, D-017).
"""

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel

CASE_AND_ACCENT_SENSITIVE = 'utf8mb4_0900_as_ci'
MIN_PRICE_VND = 1000


class Category(BaseModel):
    name = models.CharField(max_length=50, unique=True, db_collation=CASE_AND_ACCENT_SENSITIVE)
    icon = models.CharField(max_length=50, null=True, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    # Hidden instead of deleted once products use it (A-07).
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'categories'
        ordering = ('display_order', 'name')

    def __str__(self):
        return self.name


class Unit(models.TextChoices):
    KG = 'KG', 'kg'
    BUNCH = 'BUNCH', 'bó'
    PIECE = 'PIECE', 'quả/cái'
    PACK = 'PACK', 'gói/hộp'


class Product(BaseModel):
    """stock_quantity is the available stock: quantities held by open orders are already deducted (D-005).

    No HistoricalRecords: stock is decremented in bulk under select_for_update (D-004).
    """

    farmer = models.ForeignKey('accounts.FarmerProfile', on_delete=models.RESTRICT, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.RESTRICT, related_name='products')
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='products/', max_length=255, null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=0)
    unit = models.CharField(max_length=10, choices=Unit.choices)
    stock_quantity = models.PositiveIntegerField(default=0)
    # NULL = not part of the weekly template (D-008).
    weekly_default_quantity = models.PositiveIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    is_hidden_by_admin = models.BooleanField(default=False)
    hidden_reason = models.CharField(max_length=500, null=True, blank=True)
    hidden_at = models.DateTimeField(null=True, blank=True)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hidden_products',
    )

    class Meta:
        db_table = 'products'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['farmer', 'is_archived'], name='products_farmer_archived_idx'),
            models.Index(
                fields=['category', 'is_archived', 'is_hidden_by_admin'], name='products_category_public_idx',
            ),
            models.Index(fields=['price'], name='products_price_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=MIN_PRICE_VND), name='products_price_min'),
        ]

    def __str__(self):
        return self.name
