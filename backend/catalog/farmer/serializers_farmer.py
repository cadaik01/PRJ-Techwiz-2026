from decimal import Decimal
from typing import Any

from rest_framework import serializers

from catalog.models import Category, Product, Unit
from catalog.services.farmer_product import validate_image_upload
from catalog.services.stock import get_pending_quantities


class FarmerProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class FarmerProductSerializer(serializers.ModelSerializer):
    category = FarmerProductCategorySerializer(read_only=True)
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    pending_quantity = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "category_id",
            "description",
            "image",
            "price",
            "unit",
            "stock_quantity",
            "weekly_default_quantity",
            "is_available",
            "is_archived",
            "is_hidden_by_admin",
            "hidden_reason",
            "pending_quantity",
            "available_stock",
            "created_at",
            "updated_at",
        ]

    def get_pending_quantity(self, obj: Product) -> int:
        precomputed = self.context.get("pending_quantities")
        if precomputed is not None:
            return precomputed.get(obj.id, 0)
        return get_pending_quantities(product_ids=[obj.id]).get(obj.id, 0)

    def get_available_stock(self, obj: Product) -> int:
        pending = self.get_pending_quantity(obj)
        return max(obj.stock_quantity - pending, 0)


class FarmerProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=100, required=True)
    category_id = serializers.IntegerField(required=True)
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=Decimal("10000.00"),
        required=True,
    )
    unit = serializers.ChoiceField(choices=Unit.choices, required=True)
    stock_quantity = serializers.IntegerField(min_value=0, required=True)
    weekly_default_quantity = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    image = serializers.FileField(required=False, allow_null=True)
    is_available = serializers.BooleanField(required=False, default=True)

    def validate_category_id(self, value: int) -> int:
        if not Category.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Category does not exist or is inactive.")
        return value

    def validate_image(self, value: Any) -> Any:
        if value:
            validate_image_upload(value)
        return value


class FarmerProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=100, required=False)
    category_id = serializers.IntegerField(required=False)
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=Decimal("10000.00"),
        required=False,
    )
    unit = serializers.ChoiceField(choices=Unit.choices, required=False)
    stock_quantity = serializers.IntegerField(min_value=0, required=False)
    weekly_default_quantity = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    image = serializers.FileField(required=False, allow_null=True)
    is_available = serializers.BooleanField(required=False)

    def validate_category_id(self, value: int) -> int:
        if not Category.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Category does not exist or is inactive.")
        return value

    def validate_image(self, value: Any) -> Any:
        if value:
            validate_image_upload(value)
        return value


class WeeklyTemplateRowSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    name = serializers.CharField()
    weekly_default_quantity = serializers.IntegerField(allow_null=True)
    held_quantity = serializers.IntegerField()
    pending_quantity = serializers.IntegerField()
    current_stock = serializers.IntegerField()
    new_stock = serializers.IntegerField()
    is_available = serializers.BooleanField()
