from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import CustomUser, FarmerProfile, Role, RoleCode
from marketlink_core.exceptions import ErrorCode, UnprocessableEntityError
from markets.models import FarmerClosure, FarmerMarket, Market, MarketClosure, MarketOperatingDay, PickupSlot
from markets.services.validation import validate_pickup_date


class MarketsValidationTestCase(TestCase):
    def setUp(self):
        farmer_role, _ = Role.objects.get_or_create(
            code=RoleCode.FARMER, defaults={"name": "Farmer"}
        )
        self.farmer_user = CustomUser.objects.create(
            email="farmer_val@marketlink.local",
            role=farmer_role,
        )
        self.farmer = FarmerProfile.objects.create(
            user=self.farmer_user,
            stall_name="Validation Stall",
            contact_person="Tran Van Val",
            phone="0988111222",
            address="123 Val Road",
            order_cutoff_hours=6,
        )

        self.market = Market.objects.create(
            name="Val Market",
            address="456 Val Blvd",
            latitude=Decimal("10.7769"),
            longitude=Decimal("106.7009"),
            open_time="06:00:00",
            close_time="20:00:00",
            is_active=True,
        )
        self.farmer_market = FarmerMarket.objects.create(
            farmer=self.farmer,
            market=self.market,
            stall_label="Stall V1",
        )

        # Open market on all 7 weekdays
        for day in range(1, 8):
            MarketOperatingDay.objects.create(market=self.market, day_of_week=day)

        now = timezone.now()
        self.target_date = (now + timedelta(days=2)).date()
        self.slot = PickupSlot.objects.create(
            farmer_market=self.farmer_market,
            day_of_week=self.target_date.isoweekday(),
            start_time="14:00:00",
            end_time="16:00:00",
            is_active=True,
        )

    def test_valid_pickup_schedule(self):
        schedule = validate_pickup_date(
            farmer_id=self.farmer.pk,
            market_id=self.market.pk,
            pickup_date=self.target_date,
            pickup_slot_id=self.slot.pk,
        )
        self.assertEqual(schedule.slot.pk, self.slot.pk)
        self.assertEqual(schedule.start_at.date(), self.target_date)
        self.assertEqual(schedule.cutoff_at, schedule.start_at - timedelta(hours=6))

    def test_pickup_date_beyond_horizon_fails(self):
        beyond_date = timezone.localdate() + timedelta(days=8)
        # Create matching slot for that weekday
        far_slot = PickupSlot.objects.create(
            farmer_market=self.farmer_market,
            day_of_week=beyond_date.isoweekday(),
            start_time="14:00:00",
            end_time="16:00:00",
            is_active=True,
        )

        with self.assertRaises(UnprocessableEntityError) as ctx:
            validate_pickup_date(
                farmer_id=self.farmer.pk,
                market_id=self.market.pk,
                pickup_date=beyond_date,
                pickup_slot_id=far_slot.pk,
            )
        self.assertEqual(ctx.exception.code, ErrorCode.SLOT_NOT_AVAILABLE)

    def test_pickup_date_in_past_fails(self):
        past_date = timezone.localdate() - timedelta(days=1)
        with self.assertRaises(UnprocessableEntityError) as ctx:
            validate_pickup_date(
                farmer_id=self.farmer.pk,
                market_id=self.market.pk,
                pickup_date=past_date,
                pickup_slot_id=self.slot.pk,
            )
        self.assertEqual(ctx.exception.code, ErrorCode.SLOT_NOT_AVAILABLE)

    def test_market_closure_fails(self):
        MarketClosure.objects.create(
            market=self.market,
            start_date=self.target_date,
            end_date=self.target_date,
            reason="Public holiday renovation",
        )

        with self.assertRaises(UnprocessableEntityError) as ctx:
            validate_pickup_date(
                farmer_id=self.farmer.pk,
                market_id=self.market.pk,
                pickup_date=self.target_date,
                pickup_slot_id=self.slot.pk,
            )
        self.assertEqual(ctx.exception.code, ErrorCode.SLOT_NOT_AVAILABLE)

    def test_farmer_closure_fails(self):
        FarmerClosure.objects.create(
            farmer=self.farmer,
            start_date=self.target_date,
            end_date=self.target_date,
            reason="Family event",
        )

        with self.assertRaises(UnprocessableEntityError) as ctx:
            validate_pickup_date(
                farmer_id=self.farmer.pk,
                market_id=self.market.pk,
                pickup_date=self.target_date,
                pickup_slot_id=self.slot.pk,
            )
        self.assertEqual(ctx.exception.code, ErrorCode.SLOT_NOT_AVAILABLE)

    def test_cutoff_passed_fails(self):
        # Set cutoff hours high enough so cutoff has already passed
        self.farmer.order_cutoff_hours = 72
        self.farmer.save()

        with self.assertRaises(UnprocessableEntityError) as ctx:
            validate_pickup_date(
                farmer_id=self.farmer.pk,
                market_id=self.market.pk,
                pickup_date=self.target_date,
                pickup_slot_id=self.slot.pk,
            )
        self.assertEqual(ctx.exception.code, ErrorCode.CUTOFF_PASSED)
