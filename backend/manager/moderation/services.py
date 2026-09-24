"""
Module: manager.moderation.services
Description: Hide or restore a product or a review (FR-54, AD-21, AD-23, AD-24, D-016,
             D-017). Nothing is deleted: the row is flagged and keeps who hid it, when and why.
"""

from django.db import transaction
from django.db.models import CharField, QuerySet, Value
from django.utils import timezone

from reviews.models import FarmerReview, ProductReview

REVIEW_MODELS = {'FARMER': FarmerReview, 'PRODUCT': ProductReview}


def set_hidden(*, model, object_id: int, actor, reason: str | None) -> None:
    """Works on Product, FarmerReview and ProductReview. `reason` hides; None restores.

    Hiding an already hidden row only refreshes the reason.
    """
    with transaction.atomic():
        instance = model.objects.select_for_update(of=('self',)).get(id=object_id)
        hide = reason is not None
        instance.is_hidden_by_admin = hide
        instance.hidden_reason = reason
        instance.hidden_at = timezone.now() if hide else None
        instance.hidden_by = actor if hide else None
        instance.save(update_fields=['is_hidden_by_admin', 'hidden_reason', 'hidden_at', 'hidden_by', 'updated_at'])


def review_keys(*, review_type: str | None, rating: int | None, is_hidden: bool | None) -> QuerySet:
    """(type, id, created_at) of both review tables in one ordered queryset, so one page spans both."""
    parts = []
    for type_code, model in REVIEW_MODELS.items():
        if review_type and review_type != type_code:
            continue
        queryset = model.objects.all()
        if rating is not None:
            queryset = queryset.filter(rating=rating)
        if is_hidden is not None:
            queryset = queryset.filter(is_hidden_by_admin=is_hidden)
        tagged = queryset.annotate(type=Value(type_code, output_field=CharField()))
        parts.append(tagged.values('type', 'id', 'created_at'))
    first, *rest = parts
    keys = first.union(*rest, all=True) if rest else first
    return keys.order_by('-created_at', '-id')
