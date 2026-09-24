"""
Module: manager.farmers.serializers_admin
Description: Admin farmer shapes: AdminFarmerRow (AD-02) and the A-03 profile (AD-03),
             which is FarmerPublic (Pass 4B §3.2) plus admin-only fields.
"""

from django.db.models import Avg, Count, Q
from rest_framework import serializers

from accounts.models import FarmerProfile
from manager.common.products import FarmerProductSerializer, admin_products, rounded_rating
from orders.models import Order, OrderStatus
from reviews.models import FarmerReview

PROFILE_PRODUCTS = 20


class AdminFarmerRowSerializer(serializers.ModelSerializer):
    """Needs the annotations from admin_farmers(). `id` is the farmer's user id (Pass 4B §1.1)."""

    id = serializers.IntegerField(source='user_id')
    email = serializers.EmailField(source='user.email')
    date_joined = serializers.DateTimeField(source='user.date_joined')
    product_count = serializers.IntegerField()
    open_order_count = serializers.IntegerField()

    class Meta:
        model = FarmerProfile
        fields = [
            'id', 'stall_name', 'contact_person', 'phone', 'email', 'status', 'date_joined',
            'product_count', 'open_order_count',
        ]
        read_only_fields = fields


def _coordinate(value):
    return None if value is None else float(value)


class FarmerAdminDetailSerializer(serializers.ModelSerializer):
    """FarmerPublic & { email, status, status_reason, products, order_stats, status_history }.

    Expects farmer_markets prefetched with market and pickup_slots.
    """

    id = serializers.IntegerField(source='user_id')
    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()
    markets = serializers.SerializerMethodField()
    operating_days = serializers.SerializerMethodField()
    in_stock_product_count = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    pickup_windows = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')
    products = serializers.SerializerMethodField()
    order_stats = serializers.SerializerMethodField()
    status_history = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = [
            # FarmerSummary
            'id', 'stall_name', 'image', 'rating_avg', 'rating_count', 'markets', 'operating_days',
            'in_stock_product_count', 'distance_km', 'is_favorite',
            # FarmerPublic
            'contact_person', 'phone', 'address', 'description', 'latitude', 'longitude',
            'order_cutoff_hours', 'pickup_windows',
            # Admin only
            'email', 'status', 'status_reason', 'products', 'order_stats', 'status_history',
        ]
        read_only_fields = fields

    def _ratings(self, farmer) -> dict:
        if not hasattr(self, '_rating_cache'):
            self._rating_cache = FarmerReview.objects.filter(
                order__farmer=farmer, is_hidden_by_admin=False,
            ).aggregate(avg=Avg('rating'), count=Count('id'))
        return self._rating_cache

    def get_rating_avg(self, farmer):
        return rounded_rating(self._ratings(farmer)['avg'])

    def get_rating_count(self, farmer) -> int:
        return self._ratings(farmer)['count']

    def get_markets(self, farmer) -> list[dict]:
        return [{'market_id': fm.market_id, 'market_name': fm.market.name, 'stall_label': fm.stall_label}
                for fm in farmer.farmer_markets.all()]

    def get_operating_days(self, farmer) -> list[int]:
        return sorted({slot.day_of_week for fm in farmer.farmer_markets.all()
                       for slot in fm.pickup_slots.all() if slot.is_active})

    def get_in_stock_product_count(self, farmer) -> int:
        return farmer.products.filter(
            is_archived=False, is_hidden_by_admin=False, is_available=True, stock_quantity__gt=0,
        ).count()

    def get_distance_km(self, farmer):
        return None

    def get_is_favorite(self, farmer):
        return None

    def get_latitude(self, farmer):
        return _coordinate(farmer.latitude)

    def get_longitude(self, farmer):
        return _coordinate(farmer.longitude)

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

    def get_products(self, farmer) -> list[dict]:
        products = admin_products(farmer.products.all()).order_by('-created_at', '-id')[:PROFILE_PRODUCTS]
        return FarmerProductSerializer(products, many=True, context=self.context).data

    def get_order_stats(self, farmer) -> dict:
        def status_count(status):
            return Count('id', filter=Q(status=status))

        return Order.objects.filter(farmer=farmer).aggregate(
            total=Count('id'),
            completed=status_count(OrderStatus.COMPLETED),
            declined=status_count(OrderStatus.DECLINED),
            expired=status_count(OrderStatus.EXPIRED),
            no_show=status_count(OrderStatus.NO_SHOW),
        )

    def get_status_history(self, farmer) -> list[dict]:
        """Status changes from farmer_profile_histories, diffed in memory (one query, no prev_record)."""
        changes, previous = [], None
        for record in farmer.history.select_related('history_user').order_by('history_date', 'history_id'):
            if record.status != previous:
                changes.append({
                    'from_status': previous, 'to_status': record.status,
                    'reason': record.history_change_reason,
                    'changed_by': getattr(record.history_user, 'email', None),
                    'changed_at': serializers.DateTimeField().to_representation(record.history_date),
                })
                previous = record.status
        return changes
