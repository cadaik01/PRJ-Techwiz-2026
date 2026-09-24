"""
Module: markets.public.serializers_public
Description: `MarketSummary` and `Market` (Pass 4B §3.2). Needs public_markets().
"""

from rest_framework import serializers

from markets.models import Market
from markets.public.geo import rounded_km

TIME_FORMAT = '%H:%M'


class MarketSummarySerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    operating_days = serializers.SerializerMethodField()
    open_time = serializers.TimeField(format=TIME_FORMAT)
    close_time = serializers.TimeField(format=TIME_FORMAT)
    farmer_count = serializers.IntegerField()
    distance_km = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Market
        fields = [
            'id', 'name', 'address', 'image', 'latitude', 'longitude', 'operating_days',
            'open_time', 'close_time', 'farmer_count', 'distance_km', 'is_favorite',
        ]
        read_only_fields = fields

    def get_operating_days(self, market) -> list[int]:
        return [day.day_of_week for day in market.operating_days.all()]

    def get_distance_km(self, market):
        return rounded_km(getattr(market, 'distance_km', None))

    def get_is_favorite(self, market):
        # Only a signed-in customer has favorites; everyone else gets null.
        return getattr(market, 'is_favorite', None)


class MarketDetailSerializer(MarketSummarySerializer):
    class Meta(MarketSummarySerializer.Meta):
        fields = [*MarketSummarySerializer.Meta.fields, 'description', 'map_provider']
        read_only_fields = fields
