from datetime import date
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils import timezone

from accounts.models import FarmerStatus
from catalog.services.stock import apply_stock_delta, lock_products
from marketlink_core.context import get_request_id
from marketlink_core.exceptions import (
    BusinessValidationError,
    ConflictError,
    ErrorCode,
    ForbiddenActionError,
    PreconditionRequiredError,
    UnprocessableEntityError,
)
from markets.services.validation import validate_pickup_date
from notifications.models import NotificationType
from notifications.services import notify
from orders.models import ActorRole, Order, OrderItem, OrderStatus, OrderStatusHistory
from orders.services.notification_context import build_order_context

REASON_MAX_LENGTH = 500


def approve_change_request(
    *,
    order_id: int,
    farmer_id: int,
    expected_version: int | None,
    actor: Any | None = None,
) -> Order:
    if expected_version is None:
        raise PreconditionRequiredError("The If-Match header is required.")

    now = timezone.now()

    with transaction.atomic():
        order = (
            Order.objects.select_for_update()
            .select_related("farmer", "customer", "market")
            .filter(id=order_id)
            .first()
        )
        if not order:
            raise UnprocessableEntityError("Order not found.", code=ErrorCode.NOT_FOUND)

        if order.farmer_id != farmer_id:
            raise ForbiddenActionError(code=ErrorCode.ACTION_NOT_PERMITTED_FOR_ROLE)
        if order.farmer.status == FarmerStatus.SUSPENDED:
            raise ForbiddenActionError(
                "Your stall is suspended, so change requests cannot be approved.",
                code=ErrorCode.FARMER_SUSPENDED,
            )

        if order.version != expected_version:
            raise ConflictError(
                "This order was just updated by someone else. Please reload.",
                code=ErrorCode.RESOURCE_MODIFIED,
            )

        if order.status != OrderStatus.ACCEPTED or not order.pending_change:
            raise UnprocessableEntityError(
                "Order is not in ACCEPTED state with a pending change request.",
                code=ErrorCode.FAILED_PRECONDITION,
            )

        if now >= order.pickup_start_at:
            raise UnprocessableEntityError(
                "Pickup has already started for this order.",
                code=ErrorCode.PICKUP_ALREADY_STARTED,
            )

        pending = order.pending_change
        pending_items = pending.get("items")
        new_pickup_date_str = pending.get("pickup_date")
        new_slot_id = pending.get("pickup_slot_id")
        new_note = pending.get("note")

        validated_slot = None
        parsed_pickup_date = None
        if new_pickup_date_str and new_slot_id:
            try:
                parsed_pickup_date = date.fromisoformat(new_pickup_date_str)
            except ValueError as exc:
                raise BusinessValidationError(
                    errors={"pickup_date": ["Invalid ISO date format."]}
                ) from exc

            validated_slot = validate_pickup_date(
                farmer_id=order.farmer_id,
                market_id=order.market_id,
                pickup_date=parsed_pickup_date,
                pickup_slot_id=new_slot_id,
            )

        old_items = {item.product_id: item for item in order.items.select_for_update()}

        if pending_items is not None:
            new_items_dict: dict[int, int] = {
                entry["product_id"]: entry["quantity"] for entry in pending_items
            }

            all_product_ids = sorted(set(old_items.keys()) | set(new_items_dict.keys()))
            locked_products = lock_products(product_ids=all_product_ids)

            for pid, new_qty in new_items_dict.items():
                prod = locked_products.get(pid)
                if not prod or prod.farmer_id != order.farmer_id:
                    raise UnprocessableEntityError(
                        f"Product {pid} does not belong to this farmer.",
                        code=ErrorCode.PRODUCT_NOT_AVAILABLE,
                    )
                old_qty = old_items[pid].quantity if pid in old_items else 0
                if new_qty > old_qty and (not prod.is_available or prod.is_archived or prod.is_hidden_by_admin):
                    raise UnprocessableEntityError(
                        f"Product {prod.name} is not available.",
                        code=ErrorCode.PRODUCT_NOT_AVAILABLE,
                    )

            deltas: dict[int, int] = {}
            for pid in all_product_ids:
                old_qty = old_items[pid].quantity if pid in old_items else 0
                new_qty = new_items_dict.get(pid, 0)
                delta = old_qty - new_qty
                if delta != 0:
                    deltas[pid] = delta

            if deltas:
                apply_stock_delta(products=locked_products, deltas=deltas)

            order.items.all().delete()
            new_order_items = []
            for entry in pending_items:
                pid = entry["product_id"]
                qty = entry["quantity"]
                unit_price = Decimal(str(entry["unit_price"]))
                prod = locked_products[pid]
                new_order_items.append(
                    OrderItem(
                        order=order,
                        product=prod,
                        product_name=prod.name,
                        unit=prod.unit,
                        unit_price=unit_price,
                        quantity=qty,
                        line_total=unit_price * qty,
                    )
                )
            OrderItem.objects.bulk_create(new_order_items)
            order.total_amount = sum(item.line_total for item in new_order_items)

        if validated_slot is not None and parsed_pickup_date is not None:
            order.pickup_date = parsed_pickup_date
            order.pickup_slot = validated_slot
            start_dt = timezone.make_aware(
                timezone.datetime.combine(parsed_pickup_date, validated_slot.start_time)
            )
            end_dt = timezone.make_aware(
                timezone.datetime.combine(parsed_pickup_date, validated_slot.end_time)
            )
            cutoff_dt = start_dt - timezone.timedelta(hours=order.farmer.order_cutoff_hours)
            order.pickup_start_at = start_dt
            order.pickup_end_at = end_dt
            order.cutoff_at = cutoff_dt

        if new_note is not None:
            order.note = new_note

        order.pending_change = None
        order.version += 1
        update_fields = [
            "pending_change",
            "version",
            "updated_at",
            "total_amount",
            "note",
            "pickup_date",
            "pickup_slot",
            "pickup_start_at",
            "pickup_end_at",
            "cutoff_at",
        ]
        order.save(update_fields=update_fields)

        OrderStatusHistory.objects.create(
            order=order,
            from_status=OrderStatus.ACCEPTED,
            to_status=OrderStatus.ACCEPTED,
            transition=None,
            actor=actor,
            actor_role=ActorRole.FARMER,
            change_reason="Farmer approved change request",
            request_id=get_request_id(),
        )

        notify(
            recipient=order.customer,
            event_type=NotificationType.ORDER_CHANGE_APPROVED,
            context=build_order_context(order),
        )

        return order


def reject_change_request(
    *,
    order_id: int,
    farmer_id: int,
    expected_version: int | None,
    actor: Any | None = None,
    reason: str | None = None,
) -> Order:
    if expected_version is None:
        raise PreconditionRequiredError("The If-Match header is required.")

    if reason and len(reason) > REASON_MAX_LENGTH:
        raise BusinessValidationError(
            errors={"reason": [f"Reason must be at most {REASON_MAX_LENGTH} characters."]}
        )

    now = timezone.now()

    with transaction.atomic():
        order = (
            Order.objects.select_for_update()
            .select_related("farmer", "customer", "market")
            .filter(id=order_id)
            .first()
        )
        if not order:
            raise UnprocessableEntityError("Order not found.", code=ErrorCode.NOT_FOUND)

        if order.farmer_id != farmer_id:
            raise ForbiddenActionError(code=ErrorCode.ACTION_NOT_PERMITTED_FOR_ROLE)
        if order.farmer.status == FarmerStatus.SUSPENDED:
            raise ForbiddenActionError(
                "Your stall is suspended, so change requests cannot be rejected.",
                code=ErrorCode.FARMER_SUSPENDED,
            )

        if order.version != expected_version:
            raise ConflictError(
                "This order was just updated by someone else. Please reload.",
                code=ErrorCode.RESOURCE_MODIFIED,
            )

        if order.status != OrderStatus.ACCEPTED or not order.pending_change:
            raise UnprocessableEntityError(
                "Order is not in ACCEPTED state with a pending change request.",
                code=ErrorCode.FAILED_PRECONDITION,
            )

        if now >= order.pickup_start_at:
            raise UnprocessableEntityError(
                "Pickup has already started for this order.",
                code=ErrorCode.PICKUP_ALREADY_STARTED,
            )

        order.pending_change = None
        order.version += 1
        order.save(update_fields=["pending_change", "version", "updated_at"])

        clean_reason = reason.strip() if reason else None
        history_reason = (
            f"Farmer rejected change request: {clean_reason}"
            if clean_reason
            else "Farmer rejected change request"
        )

        OrderStatusHistory.objects.create(
            order=order,
            from_status=OrderStatus.ACCEPTED,
            to_status=OrderStatus.ACCEPTED,
            transition=None,
            actor=actor,
            actor_role=ActorRole.FARMER,
            change_reason=history_reason,
            request_id=get_request_id(),
        )

        customer_reason = clean_reason or "The farmer could not accommodate the requested changes."
        notify(
            recipient=order.customer,
            event_type=NotificationType.ORDER_CHANGE_REJECTED,
            context={**build_order_context(order), "reason": customer_reason},
        )

        return order
