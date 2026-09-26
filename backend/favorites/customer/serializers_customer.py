from rest_framework import serializers


class FavoriteFarmerWriteSerializer(serializers.Serializer):
    farmer_id = serializers.IntegerField(min_value=1)


class FavoriteProductWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)


class FavoriteMarketWriteSerializer(serializers.Serializer):
    market_id = serializers.IntegerField(min_value=1)
