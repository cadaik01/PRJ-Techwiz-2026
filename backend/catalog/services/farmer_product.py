import io
import logging
from pathlib import Path
from typing import Any

from django.db import transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from PIL import Image, UnidentifiedImageError

from accounts.models import FarmerProfile
from catalog.models import Product
from catalog.services.stock import (
    get_pending_quantities,
    get_weekly_pattern_held_quantities,
)
from favorites.models import FavoriteProduct
from marketlink_core.exceptions import (
    BusinessValidationError,
    ErrorCode,
)
from markets.models import FarmerMarket, PickupSlot
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import Order, OrderItem, OrderStatus
from orders.services.expiry import expire_overdue_orders
from orders.services.fsm import run_with_retry_if_top_level
from reviews.models import ProductReview

logger = logging.getLogger("marketlink")

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB per F-05 spec
# NFR-01: extension + MIME + magic bytes. The stored extension comes from the decoded format.
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_FORMAT_EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def _image_error(message: str) -> BusinessValidationError:
    return BusinessValidationError(message, code=ErrorCode.VALIDATION_ERROR, errors={"image": [message]})


def validate_image_upload(file: Any) -> None:
    """
    NFR-01 / CT-18: check extension, declared MIME type, size and the real content (Pillow).
    On success the upload is renamed so the stored extension matches the decoded format;
    the client's filename is never trusted.
    """
    if file is None:
        return

    extension = Path(getattr(file, "name", "") or "").suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise _image_error("Only JPG, PNG or WEBP images are allowed.")

    content_type = (getattr(file, "content_type", None) or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise _image_error("Only JPG, PNG or WEBP images are allowed.")

    size = getattr(file, "size", None)
    if size and size > MAX_IMAGE_SIZE_BYTES:
        raise _image_error("Image file size cannot exceed 2MB.")

    try:
        content = file.read()
        file.seek(0)
        img = Image.open(io.BytesIO(content))
        img.verify()
        image_format = (img.format or "").upper()
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise _image_error("The uploaded file is not a valid image.") from None

    if image_format not in IMAGE_FORMAT_EXTENSIONS:
        raise _image_error("Unsupported image format. Allowed: JPG, PNG, WEBP.")
    file.name = f"image{IMAGE_FORMAT_EXTENSIONS[image_format]}"


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
            # Savepoint per customer: one failure is rolled back alone and never breaks
            # the caller's transaction (FA-14 / FA-18).
            with transaction.atomic():
                notify(
                    recipient=fav.customer,
                    event_type=NotificationType.RESTOCK,
                    context={
                        "product_id": product.id,
                        "product_name": product.name,
                        "farmer_name": farmer_name,
                    },
                )
        except Exception:  # noqa: BLE001 - restock alerts are best effort (D-025)
            logger.exception(
                "RESTOCK notification failed for product %s, customer %s", product.id, fav.customer_id
            )
            continue
        notified += 1

    return notified


def build_product_metrics(*, farmer: FarmerProfile, product_ids: list[int]) -> dict[str, Any]:
    """Batch data for FarmerProduct (Pass 4B §3.3) so a page costs a fixed number of queries."""
    ids = list(product_ids)
    held_rows = (
        OrderItem.objects.filter(
            product_id__in=ids,
            order__status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP],
        )
        .values("product_id")
        .annotate(total=Sum("quantity"))
    )
    rating_rows = (
        ProductReview.objects.filter(order_item__product_id__in=ids, is_hidden_by_admin=False)
        .values("order_item__product_id")
        .annotate(avg=Avg("rating"), count=Count("id"))
    )
    days_by_market: dict[int, set[int]] = {}
    for slot in PickupSlot.objects.filter(farmer_market__farmer=farmer, is_active=True).values(
        "farmer_market__market_id", "day_of_week"
    ):
        days_by_market.setdefault(slot["farmer_market__market_id"], set()).add(slot["day_of_week"])
    markets = [
        {
            "market_id": fm.market_id,
            "market_name": fm.market.name,
            "days": sorted(days_by_market.get(fm.market_id, set())),
        }
        for fm in FarmerMarket.objects.filter(farmer=farmer, market__is_active=True)
        .select_related("market")
        .order_by("market__name")
    ]
    return {
        # D-029 / v1.8 option A: every open ACCEPTED / READY order, even past its pickup time.
        "held": {row["product_id"]: row["total"] for row in held_rows},
        "pending": get_pending_quantities(product_ids=ids),
        "ratings": {
            row["order_item__product_id"]: (round(float(row["avg"]), 1), row["count"]) for row in rating_rows
        },
        "markets": markets,
    }


def preview_weekly_template(*, farmer: FarmerProfile) -> dict[str, Any]:
    """
    FA-17: Lazy sweeps overdue orders and previews weekly template stock calculation (D-008, D-029).
    held_quantity only includes ACCEPTED and READY_FOR_PICKUP orders with pickup_end_at > now.
    overdue_orders is a queryset of Order objects; the view renders them as OrderSummary.
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

    # 3. Overdue orders still open (ACCEPTED or READY_FOR_PICKUP past pickup_end_at, A-004 point 5)
    overdue_orders = (
        Order.objects.filter(
            farmer=farmer,
            status__in=[OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP],
            pickup_end_at__lte=timezone.now(),
        )
        .select_related("customer__customer_profile", "farmer", "market")
        .prefetch_related("items__product")
        .order_by("pickup_end_at", "id")
    )

    return {
        "rows": rows,
        "overdue_orders": overdue_orders,
    }


def apply_weekly_template(*, farmer: FarmerProfile) -> dict[str, int]:
    """
    FA-18: Applies weekly stock template with row-locking and triggers restock alerts (D-008, D-025, D-029).
    new_stock = max(weekly_default_quantity - held_quantity, 0).
    Lock order (Pass 4A): 1. lazy sweep (own transactions) -> 2. products of the farmer.
    """
    expire_overdue_orders(farmer_id=farmer.pk)

    def _execute() -> dict[str, int]:
        with transaction.atomic():
            # Lock products of this farmer by id (Pass 4A lock order)
            products = list(
                Product.objects.select_for_update(of=("self",))
                .filter(farmer=farmer, is_archived=False, weekly_default_quantity__isnull=False)
                .order_by("id")
            )
            if not products:
                return {"updated_count": 0, "restock_notified": 0}

            held_dict = get_weekly_pattern_held_quantities(product_ids=[p.id for p in products])
            updated_count = 0
            total_restock_notified = 0
            for p in products:
                old_stock = p.stock_quantity
                new_stock = max(p.weekly_default_quantity - held_dict.get(p.id, 0), 0)
                p.stock_quantity = new_stock
                p.save(update_fields=["stock_quantity", "updated_at"])
                updated_count += 1

                # D-025 trigger: stock moves from 0 to > 0
                if old_stock == 0 and new_stock > 0 and p.is_available and not p.is_hidden_by_admin:
                    total_restock_notified += notify_restock_for_product(product=p)

        return {"updated_count": updated_count, "restock_notified": total_restock_notified}

    return run_with_retry_if_top_level(_execute)
