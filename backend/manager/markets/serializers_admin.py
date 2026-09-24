"""
Module: manager.markets.serializers_admin
Description: Admin market shapes (Pass 4B §3.2 `MarketAdmin`, AD-14 -> AD-17; A-06 rules).
"""

from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from manager.common.images import validate_image_upload
from markets.models import Market
from markets.public.closures import closure_list

TIME_FORMAT = '%H:%M'
COORDINATE_MESSAGE = 'Invalid coordinates'


class MarketAdminReadSerializer(serializers.ModelSerializer):
    """MarketAdmin = Market & { is_active, open_order_count, created_at, updated_at }."""

    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    operating_days = serializers.SerializerMethodField()
    open_time = serializers.TimeField(format=TIME_FORMAT)
    close_time = serializers.TimeField(format=TIME_FORMAT)
    upcoming_closures = serializers.SerializerMethodField()
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
            'open_time', 'close_time', 'upcoming_closures', 'farmer_count', 'distance_km', 'is_favorite',
            'description', 'map_provider', 'is_active', 'open_order_count', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_operating_days(self, market) -> list[int]:
        return [day.day_of_week for day in market.operating_days.all()]

    def get_upcoming_closures(self, market) -> list[dict]:
        return closure_list(market)

    def get_distance_km(self, market):
        return None

    def get_is_favorite(self, market):
        return None


def _length_messages(message: str) -> dict:
    return {'min_length': message, 'max_length': message, 'blank': message, 'required': message}


class MarketAdminWriteSerializer(serializers.Serializer):
    """AD-15 body; AD-16 sends any subset of it (partial=True)."""

    name = serializers.CharField(
        min_length=2, max_length=100, error_messages=_length_messages('Please enter 2–100 characters'),
        # as_ci collation: duplicate check ignores case, not accents.
        validators=[UniqueValidator(queryset=Market.objects.all(), message='A market with this name already exists')],
    )
    address = serializers.CharField(
        min_length=5, max_length=255, error_messages=_length_messages('Please enter the full address'),
    )
    description = serializers.CharField(
        max_length=1000, required=False, allow_null=True, allow_blank=True,
        error_messages={'max_length': 'The description can be at most 1,000 characters'},
    )
    image = serializers.ImageField(required=False, allow_null=True, validators=[validate_image_upload],
                                   error_messages={'invalid_image': 'The image must be JPG, PNG or WEBP, at most 2 MB',
                                                   'invalid': 'The image must be JPG, PNG or WEBP, at most 2 MB'})
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
        error_messages={'empty': 'Choose at least one operating day', 'required': 'Choose at least one operating day'},
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
            raise serializers.ValidationError({'close_time': ['The closing time must be after the opening time']})
        return attrs


class MarketClosureWriteSerializer(serializers.Serializer):
    """AD-32 body: dates from today on, end on or after start, optional public reason (D-023)."""

    start_date = serializers.DateField(error_messages={'required': 'Please choose a start date',
                                                       'invalid': 'Invalid date (use YYYY-MM-DD)'})
    end_date = serializers.DateField(error_messages={'required': 'Please choose an end date',
                                                     'invalid': 'Invalid date (use YYYY-MM-DD)'})
    reason = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True,
                                   error_messages={'max_length': 'The reason can be at most 200 characters'})

    def validate_start_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('The closure cannot start in the past')
        return value

    def validate_reason(self, value):
        return value or None

    def validate(self, attrs):
        if attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError({'end_date': ['The end date must be on or after the start date']})
        return attrs
