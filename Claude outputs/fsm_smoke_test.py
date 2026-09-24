from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from accounts.models import CustomUser, FarmerProfile
from catalog.models import Product
from catalog.services.stock import apply_stock_delta, lock_products
from markets.models import Market
from orders.models import ActorRole, Order, OrderItem, OrderStatus
from orders.services.expiry import expire_overdue_orders
from orders.services.fsm import record_order_placed, transition_order

customer = CustomUser.objects.get(email="customer@marketlink.local")
farmer = FarmerProfile.objects.get(user__email="farmer1@marketlink.local")
market = Market.objects.get(name="Cho Ben Thanh")
tomato = Product.objects.get(farmer=farmer, name="Organic Tomato")

def make_order(start_in_hours, cutoff_in_hours, qty=2):
    now = timezone.now()
    with transaction.atomic():
        apply_stock_delta(products=lock_products(product_ids=[tomato.id]), deltas={tomato.id: -qty})
        order = Order.objects.create(
            customer=customer, farmer=farmer, market=market, stall_label="Row B, Stall 12",
            pickup_date=(now + timedelta(hours=start_in_hours)).date(),
            pickup_start_at=now + timedelta(hours=start_in_hours),
            pickup_end_at=now + timedelta(hours=start_in_hours + 1),
            cutoff_at=now + timedelta(hours=cutoff_in_hours),
            total_amount=tomato.price * qty)
        OrderItem.objects.create(order=order, product=tomato, product_name=tomato.name, unit=tomato.unit,
                                 unit_price=tomato.price, quantity=qty, line_total=tomato.price * qty)
        record_order_placed(order=order, actor=customer)
    return order

def stock():
    tomato.refresh_from_db(); return tomato.stock_quantity

print("stock at start:", stock())

# A: accept -> ready -> complete (cutoff already passed, pickup in 1h)
a = make_order(start_in_hours=1, cutoff_in_hours=-1)
a = transition_order(order_id=a.id, to_status=OrderStatus.ACCEPTED, actor=farmer.user, actor_role=ActorRole.FARMER, expected_version=a.version)
a = transition_order(order_id=a.id, to_status=OrderStatus.READY_FOR_PICKUP, actor=farmer.user, actor_role=ActorRole.FARMER, expected_version=a.version)
a = transition_order(order_id=a.id, to_status=OrderStatus.COMPLETED, actor=farmer.user, actor_role=ActorRole.FARMER, expected_version=a.version)
print("A:", a.status, "version", a.version, "| stock:", stock())

# B: customer cancels before cutoff -> stock comes back
b = make_order(start_in_hours=30, cutoff_in_hours=20)
print("B placed | stock:", stock())
b = transition_order(order_id=b.id, to_status=OrderStatus.CANCELLED, actor=customer, actor_role=ActorRole.CUSTOMER, expected_version=b.version)
print("B:", b.status, "| stock:", stock())

# C: stale version -> RESOURCE_MODIFIED
c = make_order(start_in_hours=30, cutoff_in_hours=20)
try:
    transition_order(order_id=c.id, to_status=OrderStatus.ACCEPTED, actor=farmer.user, actor_role=ActorRole.FARMER, expected_version=99)
except Exception as e:
    print("C:", getattr(e, "code", e))

# D: pickup already started while PLACED -> lazy expiry returns stock
d = make_order(start_in_hours=-1, cutoff_in_hours=-2)
print("D placed | stock:", stock())
print("expired:", expire_overdue_orders(farmer_id=farmer.pk), "| stock:", stock())
d.refresh_from_db(); print("D:", d.status)

for o in (a, b, d):
    print(o.id, list(o.status_history.values_list("transition", "from_status", "to_status", "actor_role", "change_reason")))
