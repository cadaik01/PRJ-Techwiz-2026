"""
Module: accounts.public.serializers_public
Description: `FarmerSummary` (Pass 4B §3.2). Needs accounts.public.farmers.public_farmers().
"""

from rest_framework import serializers

from accounts.models import FarmerProfile


class FarmerSummarySerializer(serializers.ModelSerializer):
    """`id` is the farmer's user id. Context `market_id` adds that market's `stall_label` (PU-05)."""

    id = serializers.IntegerField(source='user_id')
    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.IntegerField()
    markets = serializers.SerializerMethodField()
    operating_days = serializers.SerializerMethodField()
    in_stock_product_count = serializers.IntegerField()
    distance_km = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = [
            'id', 'stall_name', 'image', 'rating_avg', 'rating_count', 'markets', 'operating_days',
            'in_stock_product_count', 'distance_km', 'is_favorite',
        ]
        read_only_fields = fields

    def to_representation(self, farmer):
        data = super().to_representation(farmer)
        if (market_id := self.context.get('market_id')) is not None:
            data['stall_label'] = next(
                (fm.stall_label for fm in farmer.farmer_markets.all() if fm.market_id == market_id), None,
            )
        return data

    def get_rating_avg(self, farmer):
        return None if farmer.rating_avg is None else round(float(farmer.rating_avg), 1)

    def get_markets(self, farmer) -> list[dict]:
        return [{'market_id': fm.market_id, 'market_name': fm.market.name, 'stall_label': fm.stall_label}
                for fm in farmer.farmer_markets.all()]

    def get_operating_days(self, farmer) -> list[int]:
        # Derived from active slots at active markets (Pass 4A §3.1: no stored column).
        return sorted({slot.day_of_week for fm in farmer.farmer_markets.all() for slot in fm.pickup_slots.all()})

    def get_distance_km(self, farmer):
        value = getattr(farmer, 'distance_km', None)
        return None if value is None else round(value, 2)

    def get_is_favorite(self, farmer):
        return getattr(farmer, 'is_favorite', None)
