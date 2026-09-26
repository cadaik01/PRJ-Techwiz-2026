from django.db import transaction
from django.utils import timezone

from catalog.models import Product


# D-016 / D-017: admins hide violating content with a flag, never a hard delete.
# Both actions are idempotent: AD-21 lists no error code, so re-hiding just updates the reason.
@transaction.atomic
def hide_product(*, product_id: int, reason: str, actor) -> Product:
    product = Product.objects.select_for_update().get(pk=product_id)
    product.is_hidden_by_admin = True
    product.hidden_reason = reason
    product.hidden_at = timezone.now()
    product.hidden_by = actor
    product.save(
        update_fields=["is_hidden_by_admin", "hidden_reason", "hidden_at", "hidden_by", "updated_at"]
    )
    return product


@transaction.atomic
def restore_product(*, product_id: int) -> Product:
    product = Product.objects.select_for_update().get(pk=product_id)
    product.is_hidden_by_admin = False
    product.hidden_reason = None
    product.hidden_at = None
    product.hidden_by = None
    product.save(
        update_fields=["is_hidden_by_admin", "hidden_reason", "hidden_at", "hidden_by", "updated_at"]
    )
    return product
