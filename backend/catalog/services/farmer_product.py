import io
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils import timezone
from PIL import Image, UnidentifiedImageError

from accounts.models import FarmerProfile
from catalog.models import Category, Product
from catalog.services.stock import (
    get_pending_quantities,
    get_weekly_pattern_held_quantities,
)
from favorites.models import FavoriteProduct
from marketlink_core.exceptions import (
    BusinessValidationError,
    ErrorCode,
)
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import Order, OrderStatus
from orders.services.expiry import expire_overdue_orders

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB per F-05 spec
ALLOWED_IMAGE_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}


def validate_image_upload(file: Any) -> None:
    """
    Validates uploaded image size and content integrity (CT-18).
    Prevents disguised executables (.exe -> .jpg).
    """
    if file is None:
        return

    # 1. Size check
    size = getattr(file, "size", None)
    if size and size > MAX_IMAGE_SIZE_BYTES:
        raise BusinessValidationError(
            "Image file size exceeds the 2MB limit.",
            code=ErrorCode.VALIDATION_ERROR,
            errors={"image": ["Image file size cannot exceed 2MB."]},
        )

    # 2. Content integrity and format check (Pillow)
    try:
        content = file.read()
        file.seek(0)
        img = Image.open(io.BytesIO(content))
        img.verify()
        fmt = (img.format or "").upper()
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise BusinessValidationError(
                f"Unsupported image format ({fmt}). Supported formats: JPEG, PNG, WEBP.",
                code=ErrorCode.VALIDATION_ERROR,
                errors={"image": ["Unsupported image format. Allowed: JPG, PNG, WEBP."]},
            )
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise BusinessValidationError(
            "Invalid or corrupted image file.",
            code=ErrorCode.VALIDATION_ERROR,
            errors={"image": ["The uploaded file is not a valid image."]},
        )


def notify_restock_for_product(*, product: Product) -> int:
    """
    Sends in-app RESTOCK notification to customers who favorited this product (D-025, A-021).
    Only triggered when product is public and stock moves from 0 to > 0.
    """
    if not product.is_available or product.is_archived or product.is_hidden_by_admin:
        return 0

    favorites = FavoriteProduct.objects.filter(product=product).select_related("customer")
    farmer_name = (
        getattr(product.farmer, "stall_name", None)
        or getattr(product.farmer, "contact_person", None)
        or "Farmer"
    )

    notified = 0
    for fav in favorites:
        try:
            notify(
                recipient=fav.customer,
                event_type=NotificationType.RESTOCK,
                context={
                    "product_id": product.id,
                    "product_name": product.name,
                    "farmer_name": farmer_name,
                },
            )
            notified += 1
        except Exception:
            pass

    return notified


def preview_weekly_template(*, farmer: FarmerProfile) -> dict[str, Any]:
    """
    FA-17: Lazy sweeps overdue orders and previews weekly template stock calculation (D-008, D-029).
    held_quantity only includes ACCEPTED and READY_FOR_PICKUP orders with pickup_end_at > now.
    """
    # 1. Sweep overdue orders
    expire_overdue_orders(farmer_id=farmer.pk)

    # 2. Query products with weekly default quantity or all unarchived products
    products = list(
        Product.objects.filter(farmer=farmer, is_archived=False).order_by("name", "id")
    )
    product_ids = [p.id for p in products]

    held_dict = get_weekly_pattern_held_quantities(product_ids=product_ids)
    pending_dict = get_pending_quantities(product_ids=product_ids)

    rows = []
    for p in products:
        held = held_dict.get(p.id, 0)
        pending = pending_dict.get(p.id, 0)
        tpl = p.weekly_default_quantity
        if tpl is not None:
            new_stock = max(tpl - held, 0)
        else:
            new_stock = p.stock_quantity

        rows.append(
            {
                "product_id": p.id,
                "name": p.name,
                "weekly_default_quantity": tpl,
                "held_quantity": held,
                "pending_quantity": pending,
                "current_stock": p.stock_quantity,
                "new_stock": new_stock,
                "is_available": p.is_available,
            }
        )

    # 3. Query overdue orders (ACCEPTED or READY_FOR_PICKUP past pickup_end_at)
    now = timezone.now()
    overdue_orders_qs = (
        Order.objects.filter(
            farmer=farmer,
            status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP],
            pickup_end_at__lt=now,
        )
        .order_by("pickup_end_at")
        .values("id", "pickup_date", "pickup_start_at", "pickup_end_at", "status", "total_amount")
    )

    overdue_orders = list(overdue_orders_qs)

    return {
        "rows": rows,
        "overdue_orders": overdue_orders,
    }


def apply_weekly_template(*, farmer: FarmerProfile) -> dict[str, int]:
    """
    FA-18: Applies weekly stock template with row-locking and triggers restock alerts (D-008, D-025, D-029).
    new_stock = max(weekly_default_quantity - held_quantity, 0).
    """
    with transaction.atomic():
        # Lock products
        products = list(
            Product.objects.select_for_update(of=("self",))
            .filter(farmer=farmer, is_archived=False, weekly_default_quantity__isnull=False)
            .order_by("id")
        )

        if not products:
            return {"updated_count": 0, "restock_notified": 0}

        product_ids = [p.id for p in products]
        held_dict = get_weekly_pattern_held_quantities(product_ids=product_ids)

        updated_count = 0
        total_restock_notified = 0

        for p in products:
            old_stock = p.stock_quantity
            held = held_dict.get(p.id, 0)
            new_stock = max(p.weekly_default_quantity - held, 0)

            p.stock_quantity = new_stock
            p.save(update_fields=["stock_quantity", "updated_at"])
            updated_count += 1

            # D-025 trigger: stock moves from 0 to > 0
            if old_stock == 0 and new_stock > 0 and p.is_available and not p.is_hidden_by_admin:
                total_restock_notified += notify_restock_for_product(product=p)

    return {
        "updated_count": updated_count,
        "restock_notified": total_restock_notified,
    }
