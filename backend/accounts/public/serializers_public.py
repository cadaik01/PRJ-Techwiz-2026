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


class FarmerPublicSerializer(FarmerSummarySerializer):
    """FarmerPublic = FarmerSummary & contact, location, cutoff and pickup windows (PU-07).

    Pickup windows list active slots at active markets only (Pass 4B §6.2).
    """

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    pickup_windows = serializers.SerializerMethodField()

    class Meta(FarmerSummarySerializer.Meta):
        fields = [
            *FarmerSummarySerializer.Meta.fields,
            'contact_person', 'phone', 'address', 'description', 'latitude', 'longitude',
            'order_cutoff_hours', 'pickup_windows',
        ]
        read_only_fields = fields

    def get_latitude(self, farmer):
        return None if farmer.latitude is None else float(farmer.latitude)

    def get_longitude(self, farmer):
        return None if farmer.longitude is None else float(farmer.longitude)

    def get_pickup_windows(self, farmer) -> list[dict]:
        return [
            {
                'farmer_market_id': fm.id, 'market_id': fm.market_id, 'market_name': fm.market.name,
                'stall_label': fm.stall_label,
                'latitude': float(fm.market.latitude), 'longitude': float(fm.market.longitude),
                'slots': [
                    {'id': slot.id, 'day_of_week': slot.day_of_week, 'start_time': slot.start_time.strftime('%H:%M'),
                     'end_time': slot.end_time.strftime('%H:%M'), 'is_active': slot.is_active}
                    for slot in sorted(fm.pickup_slots.all(), key=lambda s: (s.day_of_week, s.start_time))
                ],
            }
            for fm in farmer.farmer_markets.all()
        ]
