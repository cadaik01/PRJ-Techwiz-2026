import itertools
from datetime import time
from decimal import Decimal

from accounts.models import CustomerProfile, CustomUser, FarmerProfile, FarmerStatus, Role
from catalog.models import Category, Product, Unit
from markets.models import FarmerMarket, Market, MarketOperatingDay, PickupSlot

PASSWORD = "Mango2026x"
_sequence = itertools.count(1)


def _next() -> int:
    return next(_sequence)


def make_customer(*, is_active: bool = True) -> CustomUser:
    n = _next()
    user = CustomUser.objects.create_user(
        email=f"customer{n}@example.com",
        password=PASSWORD,
        role=Role.objects.get(code="CUSTOMER"),
        is_active=is_active,
    )
    CustomerProfile.objects.create(
        user=user, full_name=f"Customer {n}", phone="0912345678", address="12 Market Street"
    )
    return user


def make_farmer(*, status: str = FarmerStatus.APPROVED, cutoff_hours: int = 12) -> FarmerProfile:
    n = _next()
    user = CustomUser.objects.create_user(
        email=f"farmer{n}@example.com", password=PASSWORD, role=Role.objects.get(code="FARMER")
    )
    return FarmerProfile.objects.create(
        user=user,
        stall_name=f"Stall {n}",
        contact_person=f"Farmer {n}",
        phone="0987654321",
        address="5 Farm Road",
        status=status,
        order_cutoff_hours=cutoff_hours,
    )


def make_market(*, days=range(1, 8), is_active: bool = True) -> Market:
    n = _next()
    market = Market.objects.create(
        name=f"Market {n}",
        address=f"{n} Market Road",
        latitude=Decimal("10.772345"),
        longitude=Decimal("106.698765"),
        open_time=time(5, 0),
        close_time=time(20, 0),
        is_active=is_active,
    )
    MarketOperatingDay.objects.bulk_create(
        [MarketOperatingDay(market=market, day_of_week=day) for day in days]
    )
    return market


def make_slot(*, farmer, market, day_of_week: int, start=time(8, 0), end=time(10, 0), is_active=True) -> PickupSlot:
    farmer_market, _ = FarmerMarket.objects.get_or_create(
        farmer=farmer, market=market, defaults={"stall_label": "Row B, stall 12"}
    )
    return PickupSlot.objects.create(
        farmer_market=farmer_market, day_of_week=day_of_week, start_time=start, end_time=end, is_active=is_active
    )


def make_product(*, farmer, stock: int = 10, price: int = 25000, **overrides) -> Product:
    category, _ = Category.objects.get_or_create(name="Vegetables")
    fields = {
        "farmer": farmer,
        "category": category,
        "name": f"Product {_next()}",
        "price": Decimal(price),
        "unit": Unit.KG,
        "stock_quantity": stock,
    }
    fields.update(overrides)
    return Product.objects.create(**fields)
