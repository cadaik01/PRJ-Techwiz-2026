"""Unit tests for the "near me" helpers (A-008, D-012)."""

import math

import pytest

from accounts.models import FarmerProfile
from manager.conftest import make_farmer, make_market
from marketlink_core.exceptions import BusinessValidationError
from markets.models import Market
from markets.public.geo import COORDINATE_MESSAGE, distance_km, read_point, rounded_km

BEN_THANH = (10.772450, 106.698060)
TAN_DINH = (10.789780, 106.690190)


def reference_km(first, second):
    """Plain Python haversine, to check the expression the database evaluates."""
    lat1, lng1, lat2, lng2 = map(math.radians, [*first, *second])
    half = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(half))


def test_a_point_needs_both_halves_or_neither():
    assert read_point({}) is None
    assert read_point({'lat': '  ', 'lng': ''}) is None
    assert read_point({'lat': '10.7724', 'lng': '106.6980'}) == (10.7724, 106.698)


@pytest.mark.parametrize('params, field, message', [
    ({'lat': '10.77'}, 'lng', 'Send both latitude and longitude'),
    ({'lng': '106.69'}, 'lat', 'Send both latitude and longitude'),
    ({'lat': '91', 'lng': '106.69'}, 'lat', COORDINATE_MESSAGE),
    ({'lat': '10.77', 'lng': '181'}, 'lng', COORDINATE_MESSAGE),
    ({'lat': 'here', 'lng': '106.69'}, 'lat', COORDINATE_MESSAGE),
])
def test_bad_points_name_the_field_at_fault(params, field, message):
    with pytest.raises(BusinessValidationError) as error:
        read_point(params)

    assert error.value.errors[field] == [message]


def test_the_poles_and_the_date_line_are_inside_the_range():
    assert read_point({'lat': '-90', 'lng': '180'}) == (-90.0, 180.0)


@pytest.mark.parametrize('value, expected', [(None, None), (2.4444, 2.44), (2.4455, 2.45), (0.0, 0.0)])
def test_rounded_km(value, expected):
    assert rounded_km(value) == expected


@pytest.mark.django_db
def test_database_distance_matches_a_python_haversine():
    make_market()                                       # Ben Thanh, at the reference point
    far = make_market('Chợ Tân Định')
    Market.objects.filter(pk=far.pk).update(latitude=TAN_DINH[0], longitude=TAN_DINH[1])

    rows = dict(
        Market.objects.annotate(km=distance_km(BEN_THANH)).values_list('name', 'km'),
    )

    assert rows['Chợ Bến Thành'] == pytest.approx(0, abs=1e-6)
    assert rows['Chợ Tân Định'] == pytest.approx(reference_km(BEN_THANH, TAN_DINH), rel=1e-6)


@pytest.mark.django_db
def test_distance_is_null_when_the_row_has_no_coordinates():
    # Farmers may have no pinned location; markets always do (D-012).
    make_farmer()
    with_distance = FarmerProfile.objects.annotate(km=distance_km(BEN_THANH)).get()

    assert with_distance.km is None
