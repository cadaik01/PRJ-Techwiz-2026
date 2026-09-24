"""
Module: manager.common.products
Description: `FarmerProduct` as admins see it (Pass 4B §3.3), for A-03 and A-08.
"""

from django.db.models import Avg, Count, Prefetch, Q, QuerySet, Sum
from rest_framework import serializers

from catalog.models import Product
from markets.models import FarmerMarket, PickupSlot
from orders.models import OPEN_STATUSES

VISIBLE_REVIEW = Q(order_items__product_review__is_hidden_by_admin=False)


def admin_products(queryset: QuerySet[Product] | None = None) -> QuerySet[Product]:
    """Products with rating, held stock and the farmer's markets prefetched."""
    queryset = Product.objects.all() if queryset is None else queryset
    return (
        queryset
        .select_related('category', 'farmer')
        .prefetch_related(Prefetch(
            'farmer__farmer_markets',
            queryset=FarmerMarket.objects.select_related('market').prefetch_related(
                Prefetch('pickup_slots', queryset=PickupSlot.objects.filter(is_active=True)),
            ).order_by('market__name'),
        ))
        .annotate(
            # One row per order item: a review is one-to-one with its item, so neither
            # aggregate is multiplied by the other join.
            rating_avg=Avg('order_items__product_review__rating', filter=VISIBLE_REVIEW),
            rating_count=Count('order_items__product_review', filter=VISIBLE_REVIEW),
            held_quantity=Sum('order_items__quantity', filter=Q(order_items__order__status__in=OPEN_STATUSES)),
        )
    )


def availability(product: Product) -> str:
    """Badge value of ProductCard: IN_STOCK, OUT_OF_STOCK or UNAVAILABLE."""
    if not product.is_available or product.is_archived or product.is_hidden_by_admin:
        return 'UNAVAILABLE'
    return 'IN_STOCK' if product.stock_quantity > 0 else 'OUT_OF_STOCK'


def rounded_rating(value) -> float | None:
    return None if value is None else round(float(value), 1)


class FarmerProductSerializer(serializers.ModelSerializer):
    """ProductCard & ProductDetail & FarmerProduct fields. Needs admin_products()."""

    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    availability = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    farmer = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.IntegerField()
    is_favorite = serializers.SerializerMethodField()
    markets = serializers.SerializerMethodField()
    held_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'image', 'price', 'unit', 'stock_quantity', 'is_available', 'availability',
            'category', 'farmer', 'rating_avg', 'rating_count', 'is_favorite',
            'description', 'markets',
            'weekly_default_quantity', 'held_quantity', 'is_archived', 'is_hidden_by_admin', 'hidden_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_availability(self, product) -> str:
        return availability(product)

    def get_category(self, product) -> dict:
        return {'id': product.category_id, 'name': product.category.name}

    def get_farmer(self, product) -> dict:
        return {'id': product.farmer_id, 'stall_name': product.farmer.stall_name}

    def get_rating_avg(self, product):
        return rounded_rating(product.rating_avg)

    def get_is_favorite(self, product):
        return None

    def get_markets(self, product) -> list[dict]:
        # The farmer sells every product at every market they join; days come from active slots.
        return [
            {'market_id': fm.market_id, 'market_name': fm.market.name,
             'days': sorted({slot.day_of_week for slot in fm.pickup_slots.all()})}
            for fm in product.farmer.farmer_markets.all()
        ]

    def get_held_quantity(self, product) -> int:
        return product.held_quantity or 0
