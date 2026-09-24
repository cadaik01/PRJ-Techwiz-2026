"""
Module: markets.models
Description: markets, market_operating_days, farmer_markets, pickup_slots
             (MarketLink Pass 4A §3.2, D-012, D-013).
"""

from django.db import models
from django.db.models import F, Q

from core.models import BaseModel

CASE_AND_ACCENT_SENSITIVE = 'utf8mb4_0900_as_ci'


class DayOfWeek(models.IntegerChoices):
    """ISO numbering: 1 = Monday ... 7 = Sunday."""

    MONDAY = 1, 'Thứ 2'
    TUESDAY = 2, 'Thứ 3'
    WEDNESDAY = 3, 'Thứ 4'
    THURSDAY = 4, 'Thứ 5'
    FRIDAY = 5, 'Thứ 6'
    SATURDAY = 6, 'Thứ 7'
    SUNDAY = 7, 'Chủ nhật'


DAY_OF_WEEK_RANGE = Q(day_of_week__gte=1, day_of_week__lte=7)


class Market(BaseModel):
    name = models.CharField(max_length=100, unique=True, db_collation=CASE_AND_ACCENT_SENSITIVE)
    address = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='markets/', max_length=255, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    map_provider = models.CharField(max_length=30, default='OSM')
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'markets'
        ordering = ('name',)
        indexes = [
            models.Index(fields=['is_active'], name='markets_is_active_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(close_time__gt=F('open_time')),
                name='markets_close_after_open',
            ),
        ]

    def __str__(self):
        return self.name


class MarketOperatingDay(BaseModel):
    """Stored as rows, not JSON or a bitmask, so "markets open on day X" uses an index."""

    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name='operating_days')
    day_of_week = models.PositiveSmallIntegerField(choices=DayOfWeek.choices)

    class Meta:
        db_table = 'market_operating_days'
        ordering = ('market', 'day_of_week')
        indexes = [
            models.Index(fields=['day_of_week'], name='market_days_day_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['market', 'day_of_week'], name='market_days_unique_day'),
            models.CheckConstraint(condition=DAY_OF_WEEK_RANGE, name='market_days_day_range'),
        ]

    def __str__(self):
        return f'{self.market_id}:{self.day_of_week}'


class FarmerMarket(BaseModel):
    """A farmer selling at a market. Orders snapshot the market, so rows can be hard-deleted."""

    farmer = models.ForeignKey(
        'accounts.FarmerProfile', on_delete=models.CASCADE, related_name='farmer_markets',
    )
    market = models.ForeignKey(Market, on_delete=models.RESTRICT, related_name='farmer_markets')
    stall_label = models.CharField(max_length=30, null=True, blank=True)

    class Meta:
        db_table = 'farmer_markets'
        constraints = [
            models.UniqueConstraint(fields=['farmer', 'market'], name='farmer_markets_unique_pair'),
        ]

    def __str__(self):
        return f'{self.farmer_id}@{self.market_id}'


class PickupSlot(BaseModel):
    """Weekly recurring pickup window. Orders keep their own time snapshot (D-007)."""

    farmer_market = models.ForeignKey(FarmerMarket, on_delete=models.CASCADE, related_name='pickup_slots')
    day_of_week = models.PositiveSmallIntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'pickup_slots'
        ordering = ('farmer_market', 'day_of_week', 'start_time')
        constraints = [
            models.UniqueConstraint(
                fields=['farmer_market', 'day_of_week', 'start_time'], name='pickup_slots_unique_start',
            ),
            models.CheckConstraint(condition=DAY_OF_WEEK_RANGE, name='pickup_slots_day_range'),
            models.CheckConstraint(condition=Q(end_time__gt=F('start_time')), name='pickup_slots_end_after_start'),
        ]

    def __str__(self):
        return f'{self.farmer_market_id} d{self.day_of_week} {self.start_time}-{self.end_time}'
