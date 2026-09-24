from catalog.models import Product


def lock_products(product_ids) -> dict[int, Product]:
    """Locks products in ascending id order in one statement (Implementation Notes §3)."""
    ids = sorted(set(product_ids))
    locked = Product.objects.filter(id__in=ids).order_by("id").select_for_update(of=("self",))
    return {product.id: product for product in locked}
