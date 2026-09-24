"""
Module: manager.markets.serializers_admin
Description: Admin market shapes (Pass 4B §3.2 `MarketAdmin`, AD-14 -> AD-17; A-06 rules).
"""

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from manager.common.images import validate_image_upload
from markets.models import Market

TIME_FORMAT = '%H:%M'
COORDINATE_MESSAGE = 'Tọa độ không hợp lệ'


class MarketAdminReadSerializer(serializers.ModelSerializer):
    """MarketAdmin = Market & { is_active, open_order_count, created_at, updated_at }."""

    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    operating_days = serializers.SerializerMethodField()
    open_time = serializers.TimeField(format=TIME_FORMAT)
    close_time = serializers.TimeField(format=TIME_FORMAT)
    farmer_count = serializers.IntegerField()
    open_order_count = serializers.IntegerField()
    # Part of MarketSummary; always null here since an admin is neither locating
    # themselves nor a customer with favorites.
    distance_km = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Market
        fields = [
            'id', 'name', 'address', 'image', 'latitude', 'longitude', 'operating_days',
            'open_time', 'close_time', 'farmer_count', 'distance_km', 'is_favorite',
            'description', 'map_provider', 'is_active', 'open_order_count', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_operating_days(self, market) -> list[int]:
        return [day.day_of_week for day in market.operating_days.all()]

    def get_distance_km(self, market):
        return None

    def get_is_favorite(self, market):
        return None


def _length_messages(message: str) -> dict:
    return {'min_length': message, 'max_length': message, 'blank': message, 'required': message}


class MarketAdminWriteSerializer(serializers.Serializer):
    """AD-15 body; AD-16 sends any subset of it (partial=True)."""

    name = serializers.CharField(
        min_length=2, max_length=100, error_messages=_length_messages('Vui lòng nhập 2–100 ký tự'),
        # as_ci collation: duplicate check ignores case, not accents.
        validators=[UniqueValidator(queryset=Market.objects.all(), message='Tên chợ đã tồn tại')],
    )
    address = serializers.CharField(
        min_length=5, max_length=255, error_messages=_length_messages('Vui lòng nhập địa chỉ đầy đủ'),
    )
    description = serializers.CharField(
        max_length=1000, required=False, allow_null=True, allow_blank=True,
        error_messages={'max_length': 'Mô tả tối đa 1.000 ký tự'},
    )
    image = serializers.ImageField(required=False, allow_null=True, validators=[validate_image_upload],
                                   error_messages={'invalid_image': 'Ảnh phải là JPG/PNG/WEBP, tối đa 2MB',
                                                   'invalid': 'Ảnh phải là JPG/PNG/WEBP, tối đa 2MB'})
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-90, max_value=90,
        error_messages={key: COORDINATE_MESSAGE for key in
                        ('invalid', 'max_value', 'min_value', 'max_digits', 'max_decimal_places', 'required')},
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-180, max_value=180,
        error_messages={key: COORDINATE_MESSAGE for key in
                        ('invalid', 'max_value', 'min_value', 'max_digits', 'max_decimal_places', 'required')},
    )
    operating_days = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=7),
        allow_empty=False,
        error_messages={'empty': 'Chọn ít nhất 1 ngày họp', 'required': 'Chọn ít nhất 1 ngày họp'},
    )
    open_time = serializers.TimeField(format=TIME_FORMAT, input_formats=[TIME_FORMAT])
    close_time = serializers.TimeField(format=TIME_FORMAT, input_formats=[TIME_FORMAT])

    def validate_description(self, value):
        return value or None

    def validate_operating_days(self, value):
        return sorted(set(value))

    def validate(self, attrs):
        # On PATCH one side of the pair may come from the stored row.
        open_time = attrs.get('open_time', getattr(self.instance, 'open_time', None))
        close_time = attrs.get('close_time', getattr(self.instance, 'close_time', None))
        if open_time and close_time and close_time <= open_time:
            raise serializers.ValidationError({'close_time': ['Giờ đóng cửa phải sau giờ mở cửa']})
        return attrs
