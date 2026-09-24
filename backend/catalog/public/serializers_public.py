"""
Module: catalog.public.serializers_public
Description: Public catalog shapes (Pass 4B §3.3 `Category`, `ProductCard`, `ProductDetail`).
"""

from rest_framework import serializers

from catalog.models import Category, Product


class CategoryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'display_order']
        read_only_fields = fields


class ProductCardSerializer(serializers.ModelSerializer):
    """ProductCard (Pass 4B §3.3). Needs catalog.public.products.public_products()."""

    price = serializers.IntegerField()
    availability = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    farmer = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.IntegerField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'image', 'price', 'unit', 'stock_quantity', 'is_available', 'availability',
            'category', 'farmer', 'rating_avg', 'rating_count', 'is_favorite',
        ]
        read_only_fields = fields

    def get_availability(self, product) -> str:
        if not product.is_available:
            return 'UNAVAILABLE'
        return 'IN_STOCK' if product.stock_quantity > 0 else 'OUT_OF_STOCK'

    def get_category(self, product) -> dict:
        return {'id': product.category_id, 'name': product.category.name}

    def get_farmer(self, product) -> dict:
        return {'id': product.farmer_id, 'stall_name': product.farmer.stall_name}

    def get_rating_avg(self, product):
        return None if product.rating_avg is None else round(float(product.rating_avg), 1)

    def get_is_favorite(self, product):
        return getattr(product, 'is_favorite', None)


class ProductDetailSerializer(ProductCardSerializer):
    """ProductDetail: the farmer's active markets with the weekdays of their active slots there."""

    markets = serializers.SerializerMethodField()

    class Meta(ProductCardSerializer.Meta):
        fields = [*ProductCardSerializer.Meta.fields, 'description', 'markets']
        read_only_fields = fields

    def get_markets(self, product) -> list[dict]:
        return [
            {'market_id': fm.market_id, 'market_name': fm.market.name,
             'days': sorted({slot.day_of_week for slot in fm.pickup_slots.all()})}
            for fm in product.farmer.farmer_markets.all()
        ]
