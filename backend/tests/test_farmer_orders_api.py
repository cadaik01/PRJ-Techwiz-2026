from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    CustomUser,
    CustomerProfile,
    FarmerProfile,
    Role,
    RoleCode,
)
from catalog.models import Category, Product, Unit
from markets.models import FarmerMarket, Market, PickupSlot
from orders.models import ActorRole, Order, OrderItem, OrderStatus
from orders.services.fsm import record_order_placed, transition_order


class FarmerOrdersAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        customer_role, _ = Role.objects.get_or_create(
            code=RoleCode.CUSTOMER, defaults={"name": "Customer"}
        )
        farmer_role, _ = Role.objects.get_or_create(
            code=RoleCode.FARMER, defaults={"name": "Farmer"}
        )

        self.customer = CustomUser.objects.create(
            email="cust_api@marketlink.local",
            role=customer_role,
        )
        CustomerProfile.objects.create(
            user=self.customer,
            full_name="Bui Customer",
            phone="0911555666",
            address="456 City Street",
        )

        self.farmer_user = CustomUser.objects.create(
            email="farmer_api@marketlink.local",
            role=farmer_role,
        )
        self.farmer = FarmerProfile.objects.create(
            user=self.farmer_user,
            stall_name="Highland Greenery",
            contact_person="Dang Farmer",
            phone="0988222333",
            address="100 Highland Way",
            order_cutoff_hours=6,
        )

        self.other_farmer_user = CustomUser.objects.create(
            email="other_farmer_api@marketlink.local",
            role=farmer_role,
        )
        self.other_farmer = FarmerProfile.objects.create(
            user=self.other_farmer_user,
            stall_name="Lowland Fields",
            contact_person="Do Farmer",
            phone="0988444555",
            address="200 Lowland Road",
            order_cutoff_hours=6,
        )

        self.market = Market.objects.create(
            name="Weekend Eco Market",
            address="88 Eco Street",
            latitude=Decimal("10.7769"),
            longitude=Decimal("106.7009"),
            open_time="06:00:00",
            close_time="20:00:00",
        )
        self.farmer_market = FarmerMarket.objects.create(
            farmer=self.farmer,
            market=self.market,
            stall_label="Stall H1",
        )

        self.category = Category.objects.create(name="Herbs")
        self.product1 = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name="Coriander",
            unit=Unit.BUNCH,
            price=Decimal("4.00"),
            stock_quantity=40,
        )
        self.product2 = Product.objects.create(
            farmer=self.farmer,
            category=self.category,
            name="Basil",
            unit=Unit.BUNCH,
            price=Decimal("6.00"),
            stock_quantity=20,
        )

        now = timezone.now()
        self.pickup_date = (now + timedelta(days=2)).date()
        self.slot = PickupSlot.objects.create(
            farmer_market=self.farmer_market,
            day_of_week=self.pickup_date.isoweekday(),
            start_time="14:00:00",
            end_time="16:00:00",
            is_active=True,
        )

    def _create_order(
        self,
        farmer: FarmerProfile,
        status: str = OrderStatus.PLACED,
        qty1: int = 2,
        qty2: int = 1,
        is_overdue: bool = False,
        pending_change: dict | None = None,
    ) -> Order:
        now = timezone.now()
        if is_overdue:
            start_at = now - timedelta(hours=2)
            end_at = now - timedelta(hours=1)
            cutoff_at = now - timedelta(hours=8)
        else:
            start_at = now + timedelta(hours=48)
            end_at = start_at + timedelta(hours=2)
            cutoff_at = now + timedelta(hours=42)

        total = self.product1.price * qty1 + self.product2.price * qty2
        order = Order.objects.create(
            customer=self.customer,
            farmer=farmer,
            market=self.market,
            pickup_slot=self.slot,
            stall_label="Stall H1",
            pickup_date=start_at.date(),
            pickup_start_at=start_at,
            pickup_end_at=end_at,
            cutoff_at=cutoff_at,
            total_amount=total,
            status=status,
            pending_change=pending_change,
        )
        if qty1 > 0:
            OrderItem.objects.create(
                order=order,
                product=self.product1,
                product_name=self.product1.name,
                unit=self.product1.unit,
                unit_price=self.product1.price,
                quantity=qty1,
                line_total=self.product1.price * qty1,
            )
        if qty2 > 0:
            OrderItem.objects.create(
                order=order,
                product=self.product2,
                product_name=self.product2.name,
                unit=self.product2.unit,
                unit_price=self.product2.price,
                quantity=qty2,
                line_total=self.product2.price * qty2,
            )
        record_order_placed(order=order, actor=self.customer)
        return order

    def test_permission_denied_for_unauthenticated_or_customer(self):
        # 1. Unauthenticated -> 401
        res = self.client.get("/api/farmer/orders/")
        self.assertEqual(res.status_code, 401)

        # 2. Customer -> 403
        self.client.force_authenticate(user=self.customer)
        res = self.client.get("/api/farmer/orders/")
        self.assertEqual(res.status_code, 403)

    def test_get_farmer_orders_list_and_tab_counts(self):
        self._create_order(farmer=self.farmer, status=OrderStatus.PLACED)
        self._create_order(farmer=self.farmer, status=OrderStatus.ACCEPTED)
        self._create_order(
            farmer=self.farmer,
            status=OrderStatus.ACCEPTED,
            pending_change={"items": [], "change_summary": "Test change"},
        )
        self._create_order(farmer=self.farmer, status=OrderStatus.COMPLETED)

        self.client.force_authenticate(user=self.farmer_user)

        # Tab PENDING (default)
        res = self.client.get("/api/farmer/orders/")
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["tab_counts"]["pending"], 1)
        self.assertEqual(data["tab_counts"]["confirmed"], 2)
        self.assertEqual(data["tab_counts"]["history"], 1)
        self.assertEqual(data["tab_counts"]["change_requests"], 1)

        # Tab CONFIRMED
        res_conf = self.client.get("/api/farmer/orders/?tab=CONFIRMED")
        self.assertEqual(res_conf.status_code, 200)
        self.assertEqual(len(res_conf.data["data"]["results"]), 2)

        # Filter change_requested=true
        res_cr = self.client.get("/api/farmer/orders/?tab=CONFIRMED&change_requested=true")
        self.assertEqual(res_cr.status_code, 200)
        self.assertEqual(len(res_cr.data["data"]["results"]), 1)

    def test_get_order_detail_and_allowed_actions(self):
        order = self._create_order(farmer=self.farmer, status=OrderStatus.PLACED)
        self.client.force_authenticate(user=self.farmer_user)

        res = self.client.get(f"/api/farmer/orders/{order.id}/")
        self.assertEqual(res.status_code, 200)
        detail = res.data["data"]
        self.assertEqual(detail["id"], order.id)
        self.assertIn("ACCEPT", detail["allowed_actions"])
        self.assertIn("DECLINE", detail["allowed_actions"])

        # Attempt to access another farmer's order -> 404
        other_order = self._create_order(farmer=self.other_farmer, status=OrderStatus.PLACED)
        res_other = self.client.get(f"/api/farmer/orders/{other_order.id}/")
        self.assertEqual(res_other.status_code, 404)

    def test_accept_order_api(self):
        order = self._create_order(farmer=self.farmer, status=OrderStatus.PLACED, qty1=2, qty2=1)
        self.client.force_authenticate(user=self.farmer_user)

        # Missing If-Match header -> 428
        res_missing = self.client.post(f"/api/farmer/orders/{order.id}/accept/")
        self.assertEqual(res_missing.status_code, 428)

        # Success with If-Match
        res = self.client.post(
            f"/api/farmer/orders/{order.id}/accept/",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["status"], OrderStatus.ACCEPTED)

        # Stock deducted: product1: 40 - 2 = 38, product2: 20 - 1 = 19
        self.product1.refresh_from_db()
        self.product2.refresh_from_db()
        self.assertEqual(self.product1.stock_quantity, 38)
        self.assertEqual(self.product2.stock_quantity, 19)

    def test_decline_order_api_with_mark_sold_out(self):
        order = self._create_order(farmer=self.farmer, status=OrderStatus.PLACED)
        self.client.force_authenticate(user=self.farmer_user)

        res = self.client.post(
            f"/api/farmer/orders/{order.id}/decline/",
            data={
                "reason": "Out of fresh basil today",
                "mark_sold_out_product_ids": [self.product2.id],
            },
            format="json",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["status"], OrderStatus.DECLINED)

        # Product2 marked sold out (stock_quantity = 0)
        self.product2.refresh_from_db()
        self.assertEqual(self.product2.stock_quantity, 0)

    def test_ready_and_complete_order_api(self):
        # Create an accepted order whose cutoff has already passed
        order = self._create_order(farmer=self.farmer, status=OrderStatus.ACCEPTED)
        # Shift cutoff_at into past to allow T9
        order.cutoff_at = timezone.now() - timedelta(minutes=5)
        order.save(update_fields=["cutoff_at"])

        self.client.force_authenticate(user=self.farmer_user)

        # Ready for pickup (T9)
        res_ready = self.client.post(
            f"/api/farmer/orders/{order.id}/ready/",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res_ready.status_code, 200)
        self.assertEqual(res_ready.data["data"]["status"], OrderStatus.READY_FOR_PICKUP)
        order.refresh_from_db()

        # Complete (T10)
        res_comp = self.client.post(
            f"/api/farmer/orders/{order.id}/complete/",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res_comp.status_code, 200)
        self.assertEqual(res_comp.data["data"]["status"], OrderStatus.COMPLETED)

    def test_no_show_order_api(self):
        # An order past pickup_end_at
        order = self._create_order(
            farmer=self.farmer, status=OrderStatus.READY_FOR_PICKUP, is_overdue=True
        )
        initial_stock = self.product1.stock_quantity
        self.client.force_authenticate(user=self.farmer_user)

        res = self.client.post(
            f"/api/farmer/orders/{order.id}/no-show/",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["status"], OrderStatus.NO_SHOW)

        # Stock restored for T11
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock_quantity, initial_stock + 2)

    def test_approve_and_reject_change_request_api(self):
        order = self._create_order(farmer=self.farmer, status=OrderStatus.ACCEPTED, qty1=2, qty2=0)
        # Deduct initial stock for ACCEPTED order
        self.product1.stock_quantity -= 2
        self.product1.save(update_fields=["stock_quantity"])

        order.pending_change = {
            "items": [
                {
                    "product_id": self.product1.id,
                    "product_name": self.product1.name,
                    "quantity": 3,
                    "unit": self.product1.unit,
                    "unit_price": "4.00",
                }
            ],
            "pickup_date": None,
            "pickup_slot_id": None,
            "note": "Changed quantity",
            "change_summary": "Spinach: 2 -> 3",
            "requested_at": timezone.now().isoformat(),
        }
        order.save(update_fields=["pending_change"])

        self.client.force_authenticate(user=self.farmer_user)

        # 1. Reject change request
        res_reject = self.client.post(
            f"/api/farmer/orders/{order.id}/change-request/reject/",
            data={"reason": "Cannot add more spinach today"},
            format="json",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res_reject.status_code, 200)
        self.assertIsNone(res_reject.data["data"]["pending_change"])
        order.refresh_from_db()
        self.assertIsNone(order.pending_change)

        # 2. Add pending_change again and Approve
        order.pending_change = {
            "items": [
                {
                    "product_id": self.product1.id,
                    "product_name": self.product1.name,
                    "quantity": 3,
                    "unit": self.product1.unit,
                    "unit_price": "4.00",
                }
            ],
            "pickup_date": None,
            "pickup_slot_id": None,
            "note": "Add 1 spinach",
            "change_summary": "Spinach: 2 -> 3",
            "requested_at": timezone.now().isoformat(),
        }
        order.save(update_fields=["pending_change"])

        res_approve = self.client.post(
            f"/api/farmer/orders/{order.id}/change-request/approve/",
            HTTP_IF_MATCH=str(order.version),
        )
        self.assertEqual(res_approve.status_code, 200)
        self.assertIsNone(res_approve.data["data"]["pending_change"])
        self.assertEqual(res_approve.data["data"]["total_amount"], "12.00")

    def test_prep_list_and_grouped_by_customer_api(self):
        self._create_order(farmer=self.farmer, status=OrderStatus.ACCEPTED, qty1=3, qty2=2)
        self._create_order(farmer=self.farmer, status=OrderStatus.READY_FOR_PICKUP, qty1=1, qty2=1)

        self.client.force_authenticate(user=self.farmer_user)

        # Prep list
        res_prep = self.client.get("/api/farmer/orders/prep-list/")
        self.assertEqual(res_prep.status_code, 200)
        prep_data = res_prep.data["data"]
        self.assertGreaterEqual(len(prep_data), 2)
        coriander = next(item for item in prep_data if item["product_id"] == self.product1.id)
        self.assertEqual(coriander["total_quantity"], 4)

        # Grouped by customer
        res_grp = self.client.get("/api/farmer/orders/grouped-by-customer/")
        self.assertEqual(res_grp.status_code, 200)
        grp_data = res_grp.data["data"]
        self.assertEqual(len(grp_data), 1)
        self.assertEqual(grp_data[0]["customer_id"], self.customer.id)
        self.assertEqual(grp_data[0]["order_count"], 2)
