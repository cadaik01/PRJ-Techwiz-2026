"""
Module: markets.admin
Description: Django admin for markets, farmer stalls and pickup slots.
"""

from django.contrib import admin

from markets.models import FarmerMarket, Market, MarketOperatingDay, PickupSlot


class MarketOperatingDayInline(admin.TabularInline):
    model = MarketOperatingDay
    extra = 0


@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'open_time', 'close_time', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'address')
    inlines = (MarketOperatingDayInline,)


class PickupSlotInline(admin.TabularInline):
    model = PickupSlot
    extra = 0


@admin.register(FarmerMarket)
class FarmerMarketAdmin(admin.ModelAdmin):
    list_display = ('farmer', 'market', 'stall_label')
    list_select_related = ('farmer', 'market')
    search_fields = ('farmer__stall_name', 'market__name')
    inlines = (PickupSlotInline,)
