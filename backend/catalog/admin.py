"""
Module: catalog.admin
Description: Django admin for categories and products.
"""

from django.contrib import admin

from catalog.models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'farmer', 'category', 'price', 'unit', 'stock_quantity',
                    'is_available', 'is_archived', 'is_hidden_by_admin')
    list_filter = ('unit', 'is_available', 'is_archived', 'is_hidden_by_admin', 'category')
    list_select_related = ('farmer', 'category')
    search_fields = ('name', 'farmer__stall_name')
