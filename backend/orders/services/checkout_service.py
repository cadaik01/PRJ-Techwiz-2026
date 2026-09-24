from django.db import connection, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import CustomerProfile, CustomUser, FarmerProfile, FarmerStatus
from accounts.services.auth_service import account_locked_error
from catalog.models import Product
from notifications.models import NotificationType
from notifications.services import notify
from orders.constants import MAX_OPEN_ORDERS_PER_FARMER, MAX_OPEN_ORDERS_TOTAL
from orders.exceptions import (
    CutoffPassedError,
    InsufficientStockError,
    OpenOrderLimitExceededError,
    ProductNotAvailableError,
    SlotNotAvailableError,
)
from orders.models import OPEN_STATUSES, ActorRole, Order, OrderItem, OrderStatus, Transition
from orders.services.expiry_service import finish_expiry, lock_overdue_orders, returned_stock
from orders.services.history_service import record_status_change
from orders.services.locking import lock_products
from orders.services.pickup_service import resolve_pickup

# Lock order (Implementation Notes §3: users / profiles -> orders -> products), taken once each, ascending id:
# users -> customer_profiles -> farmer_profiles (shared) -> overdue orders -> products (overdue + cart items).
# Locking the customer and farmer rows orders checkout against AD-12 (lock customer) and AD-07 (suspend
# farmer), so an order can never be created for an account that was locked or suspended concurrently.


def _lock_customer(customer) -> CustomUser:
    user = CustomUser.objects.select_for_update(of=("self",)).get(pk=customer.pk)
    user.customer_profile = CustomerProfile.objects.select_for_update(of=("self",)).get(user=user)
    if not user.is_active:
        raise account_locked_error(user)
    return user


def _share_lock_farmer_rows(farmer_ids) -> None:
    # FOR SHARE (Django has no select_for_share): blocks AD-07 from suspending these farmers until we commit,
    # while checkouts for the same farmer still run side by side. Rows are locked in primary-key order.
    table = connection.ops.quote_name(FarmerProfile._meta.db_table)
    column = connection.ops.quote_name(FarmerProfile._meta.pk.column)
    placeholders = ", ".join(["%s"] * len(farmer_ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT {column} FROM {table} WHERE {column} IN ({placeholders}) ORDER BY {column} FOR SHARE",
            sorted(farmer_ids),
        )


def _lock_farmers(groups) -> dict:
    ids = [group["farmer_id"] for group in groups]
    _share_lock_farmer_rows(set(ids))
    approved = FarmerProfile.objects.select_related("user").filter(
        pk__in=ids, status=FarmerStatus.APPROVED, user__is_active=True
    )
    farmers = {farmer.pk: farmer for farmer in approved}
    missing = {
        f"groups.{index}.farmer_id": ["This farmer is not accepting orders"]
        for index, farmer_id in enumerate(ids)
        if farmer_id not in farmers
    }
    if missing:
        raise ProductNotAvailableError(errors=missing)
    return farmers


def _check_open_order_limits(customer, groups, now) -> None:
    # A PLACED order past its pickup start is already "expired" for the customer (A-005) even if no sweep
    # has touched it yet, so it must not block new orders.
    open_farmer_ids = list(
        Order.objects.filter(customer=customer, status__in=OPEN_STATUSES)
        .exclude(status=OrderStatus.PLACED, pickup_start_at__lte=now)
        .values_list("farmer_id", flat=True)
    )
    errors = {
        f"groups.{index}.farmer_id": ["You already have an open order with this farmer"]
        for index, group in enumerate(groups)
        if open_farmer_ids.count(group["farmer_id"]) >= MAX_OPEN_ORDERS_PER_FARMER
    }
    if len(open_farmer_ids) + len(groups) > MAX_OPEN_ORDERS_TOTAL:
        errors["non_field_errors"] = [f"You can have at most {MAX_OPEN_ORDERS_TOTAL} open orders"]
    if errors:
        raise OpenOrderLimitExceededError(errors=errors)


def _resolve_windows(groups, farmers, now) -> list:
    windows = []
    for index, group in enumerate(groups):
        try:
            windows.append(resolve_pickup(
                farmer=farmers[group["farmer_id"]],
                pickup_slot_id=group["pickup_slot_id"],
                pickup_date=group["pickup_date"],
                now=now,
            ))
        except (SlotNotAvailableError, CutoffPassedError) as exc:
            raise type(exc)(errors={f"groups.{index}.pickup_slot_id": [str(exc.detail)]}) from exc
    return windows


def _is_published(product: Product) -> bool:
    return product.is_available and not product.is_archived and not product.is_hidden_by_admin


def _shortage_message(product: Product) -> str:
    if product.stock_quantity == 0:
        return "Out of stock"
    return f"Only {product.stock_quantity} {product.unit} left"


def _validate_products(groups, products) -> None:
    foreign, unpublished, shortages, available = {}, {}, {}, {}
    for group_index, group in enumerate(groups):
        for item_index, item in enumerate(group["items"]):
            path = f"groups.{group_index}.items.{item_index}"
            product = products.get(item["product_id"])
            if product is None or product.farmer_id != group["farmer_id"]:
                foreign[f"{path}.product_id"] = ["This product does not belong to the selected farmer"]
            elif not _is_published(product):
                unpublished[f"{path}.product_id"] = ["This product is no longer available"]
            elif product.stock_quantity < item["quantity"]:
                shortages[f"{path}.quantity"] = [_shortage_message(product)]
                available[str(product.id)] = product.stock_quantity
    if foreign:
        raise ValidationError(foreign)
    if unpublished:
        raise ProductNotAvailableError(errors=unpublished)
    if shortages:
        raise InsufficientStockError(errors=shortages, data={"available": available})


def _create_order(*, customer, farmer, group, window, products) -> Order:
    lines = [(products[item["product_id"]], item["quantity"]) for item in group["items"]]
    order = Order.objects.create(
        customer=customer,
        farmer=farmer,
        market=window.market,
        pickup_slot=window.slot,
        stall_label=window.stall_label,
        pickup_date=window.pickup_date,
        pickup_start_at=window.pickup_start_at,
        pickup_end_at=window.pickup_end_at,
        cutoff_at=window.cutoff_at,
        note=group.get("note") or None,
        total_amount=sum(product.price * quantity for product, quantity in lines),
    )
    OrderItem.objects.bulk_create([
        OrderItem(
            order=order, product=product, product_name=product.name, unit=product.unit,
            unit_price=product.price, quantity=quantity, line_total=product.price * quantity,
        )
        for product, quantity in lines
    ])
    for product, quantity in lines:
        product.stock_quantity -= quantity
        product.save(update_fields=["stock_quantity", "updated_at"])
    record_status_change(
        order=order, from_status=None, to_status=OrderStatus.PLACED, transition=Transition.T1,
        actor=customer, actor_role=ActorRole.CUSTOMER,
    )
    notify(recipient=farmer.user, event_type=NotificationType.ORDER_PLACED, context={"order": order})
    return order


def place_orders(*, customer, groups: list[dict], now=None) -> list[Order]:
    now = now or timezone.now()
    with transaction.atomic():
        customer = _lock_customer(customer)
        farmers = _lock_farmers(groups)
        overdue = lock_overdue_orders(now=now, farmer_ids=list(farmers))
        _check_open_order_limits(customer, groups, now)
        windows = _resolve_windows(groups, farmers, now)

        returned = returned_stock(overdue)
        cart_product_ids = {item["product_id"] for group in groups for item in group["items"]}
        products = lock_products(set(returned) | cart_product_ids)
        finish_expiry(orders=overdue, products=products, returned=returned)

        _validate_products(groups, products)
        return [
            _create_order(
                customer=customer, farmer=farmers[group["farmer_id"]], group=group, window=window, products=products
            )
            for group, window in zip(groups, windows)
        ]
