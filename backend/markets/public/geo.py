"""
Module: markets.public.geo
Description: "Near me" support (A-008, D-012): read lat/lng from the query and compute
             Haversine distance in the database so results can be ordered by it.
"""

from django.db.models import F, FloatField, Value
from django.db.models.functions import ASin, Cast, Cos, Power, Radians, Sin, Sqrt

from core.exceptions import BusinessValidationError

EARTH_RADIUS_KM = 6371.0
COORDINATE_MESSAGE = 'Tọa độ không hợp lệ'


def read_point(params) -> tuple[float, float] | None:
    """`lat` and `lng` together, or neither."""
    raw_lat, raw_lng = (params.get(name, '').strip() for name in ('lat', 'lng'))
    if not raw_lat and not raw_lng:
        return None
    errors = {}
    values = {}
    for name, raw, limit in (('lat', raw_lat, 90), ('lng', raw_lng, 180)):
        try:
            values[name] = float(raw)
            if not -limit <= values[name] <= limit:
                raise ValueError
        except ValueError:
            errors[name] = [COORDINATE_MESSAGE if raw else 'Cần gửi cả vĩ độ và kinh độ']
    if errors:
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors=errors)
    return values['lat'], values['lng']


def distance_km(point: tuple[float, float], *, lat_field: str = 'latitude', lng_field: str = 'longitude'):
    """Haversine distance from `point` to the row's coordinates, in km (NULL if the row has none)."""
    lat, lng = point
    row_lat = Radians(Cast(F(lat_field), FloatField()))
    row_lng = Radians(Cast(F(lng_field), FloatField()))
    origin_lat = Radians(Value(lat, output_field=FloatField()))
    origin_lng = Radians(Value(lng, output_field=FloatField()))
    half_chord = (
        Power(Sin((row_lat - origin_lat) / 2), 2)
        + Cos(origin_lat) * Cos(row_lat) * Power(Sin((row_lng - origin_lng) / 2), 2)
    )
    return Value(2 * EARTH_RADIUS_KM, output_field=FloatField()) * ASin(Sqrt(half_chord))


def rounded_km(value) -> float | None:
    return None if value is None else round(value, 2)
