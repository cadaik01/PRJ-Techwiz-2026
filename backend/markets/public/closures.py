"""
Module: markets.public.closures
Description: Upcoming closures shown on markets and farmers (D-023, Pass 4B §3.2
             `upcoming_closures`): market_closures or farmer_closures that overlap the
             next BOOKING_HORIZON_DAYS days.
"""

from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import serializers

from marketlink_core.public.views_public import contract_setting

UPCOMING_ATTR = 'upcoming_closure_list'


def upcoming_closures(lookup: str, model) -> Prefetch:
    """Prefetch the closures of `lookup` that are still running or start within the horizon."""
    today = timezone.localdate()
    last_day = today + timedelta(days=contract_setting('BOOKING_HORIZON_DAYS'))
    return Prefetch(
        lookup,
        queryset=model.objects.filter(end_date__gte=today, start_date__lte=last_day).order_by('start_date'),
        to_attr=UPCOMING_ATTR,
    )


class ClosureSerializer(serializers.Serializer):
    """Closure = { id, start_date, end_date, reason } for market_closures and farmer_closures."""

    id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    reason = serializers.CharField(allow_null=True)


def closure_list(instance) -> list[dict]:
    return ClosureSerializer(getattr(instance, UPCOMING_ATTR, []), many=True).data
