"""
Module: catalog.public.serializers_public
Description: Public catalog shapes (Pass 4B §3.3 `Category`).
"""

from rest_framework import serializers

from catalog.models import Category


class CategoryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'display_order']
        read_only_fields = fields
