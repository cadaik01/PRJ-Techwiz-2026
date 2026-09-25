from collections.abc import Iterable

from django.db.models import Sum

from catalog.models import Product
from marketlink_core.exceptions import BusinessValidationError, ErrorCode
from orders.models import OPEN_STATUSES, OrderItem


# Callers must already hold their order locks: tables are always locked orders -> products (Pass 4A §5.2).
def lock_products(*, product_ids: Iterable[int]) -> dict[int, Product]:
    ids = sorted(set(product_ids))
    products = list(Product.objects.filter(id__in=ids).order_by("id").select_for_update(of=("self",)))
    return {product.id: product for product in products}


def apply_stock_delta(*, products: dict[int, Product], deltas: dict[int, int]) -> None:
    shortages = {
        str(product_id): [f"Only {products[product_id].stock_quantity} {products[product_id].unit.lower()} left."]
        for product_id, delta in deltas.items()
        if products[product_id].stock_quantity + delta < 0
    }
    if shortages:
        raise BusinessValidationError(
            "Some items are out of stock.", code=ErrorCode.INSUFFICIENT_STOCK, errors=shortages
        )
    for product_id, delta in deltas.items():
        if delta == 0:
            continue
        product = products[product_id]
        product.stock_quantity += delta
        product.save(update_fields=["stock_quantity", "updated_at"])


def get_held_quantities(*, product_ids: Iterable[int]) -> dict[int, int]:
    rows = (
        OrderItem.objects.filter(product_id__in=set(product_ids), order__status__in=OPEN_STATUSES)
        .values("product_id")
        .annotate(held=Sum("quantity"))
    )
    return {row["product_id"]: row["held"] for row in rows}
