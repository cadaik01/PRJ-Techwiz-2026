import io
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import (
    CustomUser,
    CustomerProfile,
    FarmerProfile,
    FarmerStatus,
    Role,
    RoleCode,
)
from catalog.models import Category, Product, Unit
from favorites.models import FavoriteProduct
from marketlink_core.exceptions import ErrorCode
from markets.models import FarmerMarket, Market, PickupSlot
from notifications.models import Notification, NotificationType
from orders.models import Order, OrderItem, OrderStatus


def create_test_image(format="JPEG", size=(50, 50), color=(255, 0, 0)) -> bytes:
    img_byte_arr = io.BytesIO()
    image = Image.new("RGB", size, color)
    image.save(img_byte_arr, format=format)
    return img_byte_arr.getvalue()


class FarmerProductsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Roles
        self.farmer_role, _ = Role.objects.get_or_create(
            code=RoleCode.FARMER, defaults={"name": "Farmer"}
        )
        self.customer_role, _ = Role.objects.get_or_create(
            code=RoleCode.CUSTOMER, defaults={"name": "Customer"}
        )

        # Farmer 1 (Approved)
        self.farmer_user = CustomUser.objects.create(
            email="farmer1@marketlink.local",
            role=self.farmer_role,
        )
        self.farmer_profile = FarmerProfile.objects.create(
            user=self.farmer_user,
            stall_name="Green Garden",
            contact_person="Farmer John",
            phone="0901234567",
            address="Valley 1",
            status=FarmerStatus.APPROVED,
            order_cutoff_hours=12,
            operating_days=[0, 1, 2, 3, 4, 5, 6],
        )

        # Farmer 2 (Pending approval)
        self.pending_farmer_user = CustomUser.objects.create(
            email="farmer_pending@marketlink.local",
            role=self.farmer_role,
        )
        self.pending_farmer_profile = FarmerProfile.objects.create(
            user=self.pending_farmer_user,
            stall_name="Pending Farm",
            contact_person="Pending Pete",
            phone="0901112233",
            address="Valley 2",
            status=FarmerStatus.PENDING,
            order_cutoff_hours=12,
            operating_days=[0, 1, 2],
        )

        # Customer
        self.customer_user = CustomUser.objects.create(
            email="customer1@marketlink.local",
            role=self.customer_role,
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer_user,
            full_name="Alice Customer",
            phone="0911222333",
            address="City Center",
        )

        # Category
        self.category = Category.objects.create(name="Vegetables", is_active=True)

        # Products for Farmer 1
        self.prod1 = Product.objects.create(
            farmer=self.farmer_profile,
            category=self.category,
            name="Organic Tomato",
            price=Decimal("3.50"),
            unit=Unit.KG,
            stock_quantity=20,
            weekly_default_quantity=25,
            is_available=True,
        )
        self.prod2 = Product.objects.create(
            farmer=self.farmer_profile,
            category=self.category,
            name="Fresh Carrot",
            price=Decimal("2.00"),
            unit=Unit.KG,
            stock_quantity=0,
            weekly_default_quantity=15,
            is_available=True,
        )

    def test_fa11_list_products_and_stock_quantities(self):
        self.client.force_authenticate(user=self.farmer_user)

        # Create market & pickup slot for an active order
        now = timezone.now()
        market = Market.objects.create(
            name="Downtown Market",
            address="Main St",
            latitude=Decimal("10.0"),
            longitude=Decimal("106.0"),
            open_time=time(6, 0),
            close_time=time(18, 0),
            is_active=True,
        )
        fm = FarmerMarket.objects.create(
            farmer=self.farmer_profile,
            market=market,
            stall_label="Stall 1",
        )
        slot = PickupSlot.objects.create(
            farmer_market=fm,
            day_of_week=1,
            start_time=time(8, 0),
            end_time=time(12, 0),
            is_active=True,
        )
        order = Order.objects.create(
            customer=self.customer_user,
            farmer=self.farmer_profile,
            market=market,
            pickup_slot=slot,
            pickup_date=(now + timedelta(hours=2)).date(),
            pickup_start_at=now + timedelta(hours=2),
            pickup_end_at=now + timedelta(hours=4),
            cutoff_at=now + timedelta(hours=1),
            status=OrderStatus.PLACED,
            total_amount=Decimal("17.50"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.prod1,
            product_name="Organic Tomato",
            unit=Unit.KG,
            unit_price=Decimal("3.50"),
            quantity=5,
            line_total=Decimal("17.50"),
        )

        res = self.client.get("/api/farmer/products/")
        self.assertEqual(res.status_code, 200)
        items = res.data["data"]["results"]
        self.assertEqual(len(items), 2)

        # Check pending_quantity and available_stock calculation
        tomato_item = next(i for i in items if i["id"] == self.prod1.id)
        self.assertEqual(tomato_item["stock_quantity"], 20)
        self.assertEqual(tomato_item["pending_quantity"], 5)
        self.assertEqual(tomato_item["available_stock"], 15)

    def test_fa11_filtering_by_state(self):
        self.client.force_authenticate(user=self.farmer_user)

        # in_stock
        res_in_stock = self.client.get("/api/farmer/products/?state=in_stock")
        self.assertEqual(len(res_in_stock.data["data"]["results"]), 1)
        self.assertEqual(res_in_stock.data["data"]["results"][0]["id"], self.prod1.id)

        # out_of_stock
        res_out = self.client.get("/api/farmer/products/?state=out_of_stock")
        self.assertEqual(len(res_out.data["data"]["results"]), 1)
        self.assertEqual(res_out.data["data"]["results"][0]["id"], self.prod2.id)

    def test_fa12_create_product_approved_vs_pending(self):
        # 1. Pending farmer cannot create -> 403 FARMER_NOT_APPROVED
        self.client.force_authenticate(user=self.pending_farmer_user)
        payload = {
            "name": "Sweet Corn",
            "category_id": self.category.id,
            "price": "4.00",
            "unit": Unit.PIECE,
            "stock_quantity": 30,
        }
        res_pending = self.client.post("/api/farmer/products/", payload)
        self.assertEqual(res_pending.status_code, 403)
        self.assertEqual(res_pending.data["code"], ErrorCode.FARMER_NOT_APPROVED)

        # 2. Approved farmer can create -> 201
        self.client.force_authenticate(user=self.farmer_user)
        res_approved = self.client.post("/api/farmer/products/", payload)
        self.assertEqual(res_approved.status_code, 201)
        self.assertEqual(res_approved.data["data"]["name"], "Sweet Corn")
        self.assertEqual(res_approved.data["data"]["stock_quantity"], 30)

    def test_fa12_ct18_disguised_executable_rejected(self):
        self.client.force_authenticate(user=self.farmer_user)

        # CT-18: Fake jpg with binary exe contents
        fake_image = SimpleUploadedFile(
            name="malicious.jpg",
            content=b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00This is a fake PE executable",
            content_type="image/jpeg",
        )
        payload = {
            "name": "Hacked Product",
            "category_id": self.category.id,
            "price": "5.00",
            "unit": Unit.KG,
            "stock_quantity": 10,
            "image": fake_image,
        }
        res = self.client.post("/api/farmer/products/", payload, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["code"], ErrorCode.VALIDATION_ERROR)

    def test_fa13_get_detail_and_isolation(self):
        self.client.force_authenticate(user=self.farmer_user)
        res = self.client.get(f"/api/farmer/products/{self.prod1.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["name"], self.prod1.name)

        # Other farmer cannot see/edit
        self.client.force_authenticate(user=self.pending_farmer_user)
        res_other = self.client.get(f"/api/farmer/products/{self.prod1.id}/")
        self.assertEqual(res_other.status_code, 404)

    def test_fa14_patch_restock_alert_d025(self):
        self.client.force_authenticate(user=self.farmer_user)

        # Customer adds prod2 (stock 0) to favorites
        FavoriteProduct.objects.create(customer=self.customer_user, product=self.prod2)

        # Farmer patches prod2 stock from 0 to 10 -> triggers RESTOCK alert
        res = self.client.patch(
            f"/api/farmer/products/{self.prod2.id}/",
            {"stock_quantity": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["stock_quantity"], 10)
        self.assertEqual(res.data["data"]["restock_notified"], 1)

        # Verify notification was created in database
        notif = Notification.objects.filter(
            recipient=self.customer_user,
            type=NotificationType.RESTOCK,
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("Fresh Carrot", notif.title)

    def test_fa15_soft_delete_and_fa16_mark_sold_out(self):
        self.client.force_authenticate(user=self.farmer_user)

        # FA-16 mark sold out
        res_sold_out = self.client.post(f"/api/farmer/products/{self.prod1.id}/mark-sold-out/")
        self.assertEqual(res_sold_out.status_code, 200)
        self.prod1.refresh_from_db()
        self.assertEqual(self.prod1.stock_quantity, 0)

        # FA-15 soft delete
        res_delete = self.client.delete(f"/api/farmer/products/{self.prod1.id}/")
        self.assertEqual(res_delete.status_code, 204)
        self.prod1.refresh_from_db()
        self.assertTrue(self.prod1.is_archived)

    def test_fa17_and_fa18_weekly_template(self):
        self.client.force_authenticate(user=self.farmer_user)

        # prod1: weekly_default=25, current=20.
        # prod2: weekly_default=15, current=0.
        # FA-17 Preview
        res_preview = self.client.get("/api/farmer/products/weekly-template-preview/")
        self.assertEqual(res_preview.status_code, 200)
        rows = res_preview.data["data"]["rows"]
        self.assertEqual(len(rows), 2)

        row_tomato = next(r for r in rows if r["product_id"] == self.prod1.id)
        self.assertEqual(row_tomato["new_stock"], 25)

        # Customer favorites prod2 (currently stock 0)
        FavoriteProduct.objects.create(customer=self.customer_user, product=self.prod2)

        # FA-18 Apply
        res_apply = self.client.post("/api/farmer/products/apply-weekly-template/", {})
        self.assertEqual(res_apply.status_code, 200)
        self.assertEqual(res_apply.data["data"]["updated_count"], 2)
        # prod2 was 0, now 15 -> restock alert triggered!
        self.assertEqual(res_apply.data["data"]["restock_notified"], 1)

        self.prod1.refresh_from_db()
        self.prod2.refresh_from_db()
        self.assertEqual(self.prod1.stock_quantity, 25)
        self.assertEqual(self.prod2.stock_quantity, 15)
