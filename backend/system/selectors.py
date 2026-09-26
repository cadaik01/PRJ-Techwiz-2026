"""Read-only access to the audit trail (simple_history tables) for the Admin screens (v1.8).

audit_logs = security events (who did which sensitive action). The audit trail below = how a
record changed over time (who, when, why, old -> new values).
"""

from typing import Any

from django.db.models import Model
from rest_framework import serializers

from accounts.models import FarmerProfile
from catalog.models import Product
from markets.models import FarmerClosure, FarmerMarket, PickupSlot
from orders.models import Order, OrderItem

# Key used by the Admin API / UI -> tracked model.
TRACKED_MODELS: dict[str, type[Model]] = {
    "farmer_profile": FarmerProfile,
    "product": Product,
    "order": Order,
    "order_item": OrderItem,
    "farmer_market": FarmerMarket,
    "pickup_slot": PickupSlot,
    "farmer_closure": FarmerClosure,
}
HISTORY_TYPES = {"+": "CREATED", "~": "UPDATED", "-": "DELETED"}
IGNORED_FIELDS = {"created_at", "updated_at"}
_DATETIME_FIELD = serializers.DateTimeField()


def _user(record: Any) -> dict[str, Any] | None:
    user = record.history_user
    return {"id": user.pk, "email": user.email} if user is not None else None


def build_change_log(model: type[Model], object_id: int) -> list[dict[str, Any]]:
    """Every change of one record, oldest first, with the changed fields (old -> new)."""
    records = list(
        model.history.filter(**{model._meta.pk.attname: object_id})
        .select_related("history_user")
        .order_by("history_date", "history_id")
    )
    entries: list[dict[str, Any]] = []
    previous = None
    for record in records:
        changes: list[dict[str, Any]] = []
        if previous is not None and record.history_type == "~":
            delta = record.diff_against(previous)
            changes = [
                {"field": change.field, "old": change.old, "new": change.new}
                for change in delta.changes
                if change.field not in IGNORED_FIELDS
            ]
        entries.append(
            {
                "history_id": record.history_id,
                "type": HISTORY_TYPES.get(record.history_type, record.history_type),
                "date": _DATETIME_FIELD.to_representation(record.history_date),
                "user": _user(record),
                "reason": record.history_change_reason,
                "request_id": getattr(record, "request_id", None),
                "changes": changes,
            }
        )
        previous = record
    return entries
