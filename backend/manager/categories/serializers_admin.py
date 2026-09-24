"""
Module: manager.categories.serializers_admin
Description: Admin category shapes (Pass 4B §3.3 `CategoryAdmin`, AD-18, AD-19).
"""

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from catalog.models import Category

NAME_LENGTH_MESSAGE = 'Please enter 2–50 characters'


class CategoryAdminReadSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'display_order', 'is_active', 'product_count']
        read_only_fields = fields


class CategoryAdminCreateSerializer(serializers.ModelSerializer):
    # The column's as_ci collation makes this lookup case-insensitive but
    # accent-sensitive: "CAFÉ" clashes with "Café" but "Cafe" does not.
    name = serializers.CharField(
        min_length=2,
        max_length=50,
        error_messages={'min_length': NAME_LENGTH_MESSAGE, 'max_length': NAME_LENGTH_MESSAGE,
                        'blank': NAME_LENGTH_MESSAGE, 'required': NAME_LENGTH_MESSAGE},
        validators=[UniqueValidator(
            queryset=Category.objects.all(), message='A category with this name already exists',
        )],
    )
    icon = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    display_order = serializers.IntegerField(min_value=0, max_value=32767, required=False)

    class Meta:
        model = Category
        fields = ['name', 'icon', 'display_order']

    def validate_icon(self, value):
        return value or None


class CategoryAdminUpdateSerializer(CategoryAdminCreateSerializer):
    """PATCH also toggles `is_active`: hiding is how a used category leaves the product form."""

    class Meta(CategoryAdminCreateSerializer.Meta):
        fields = [*CategoryAdminCreateSerializer.Meta.fields, 'is_active']
