from rest_framework import serializers

from marketlink_core.geo import rounded
from markets.models import Market
from markets.selectors import OPERATING_DAYS_ATTR, UPCOMING_CLOSURES_ATTR
from markets.serializers import ClosureSerializer


class MarketSummarySerializer(serializers.ModelSerializer):
    operating_days = serializers.SerializerMethodField()
    upcoming_closures = serializers.SerializerMethodField()
    open_time = serializers.TimeField(format="%H:%M")
    close_time = serializers.TimeField(format="%H:%M")
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    farmer_count = serializers.IntegerField(read_only=True, default=0)
    distance_km = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Market
        fields = [
            "id",
            "name",
            "address",
            "image",
            "latitude",
            "longitude",
            "operating_days",
            "open_time",
            "close_time",
            "upcoming_closures",
            "farmer_count",
            "distance_km",
            "is_favorite",
        ]
        read_only_fields = fields

    def get_operating_days(self, market) -> list[int]:
        rows = getattr(market, OPERATING_DAYS_ATTR, None)
        if rows is None:
            rows = market.operating_days.order_by("day_of_week")
        return [row.day_of_week for row in rows]

    def get_upcoming_closures(self, market) -> list[dict]:
        rows = getattr(market, UPCOMING_CLOSURES_ATTR, None) or []
        return ClosureSerializer(rows, many=True).data

    def get_distance_km(self, market) -> float | None:
        return rounded(getattr(market, "distance", None))

    def get_is_favorite(self, market) -> bool | None:
        favorites = self.context.get("favorite_market_ids")
        return None if favorites is None else market.pk in favorites


class MarketSerializer(MarketSummarySerializer):
    class Meta(MarketSummarySerializer.Meta):
        fields = [*MarketSummarySerializer.Meta.fields, "description", "map_provider"]
        read_only_fields = fields
