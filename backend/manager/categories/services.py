"""
Module: manager.categories.services
Description: Category rules that need a lock (A-07, AD-19).
"""

from django.db import transaction
from django.db.models import Count, QuerySet

from catalog.models import Category
from core.exceptions import UnprocessableEntityError


def admin_categories() -> QuerySet[Category]:
    """Every category with `product_count`, archived products included: any product blocks a delete."""
    # Django drops Meta.ordering on GROUP BY queries, so the order is repeated here.
    return Category.objects.annotate(product_count=Count('products')).order_by('display_order', 'name')


def delete_category(*, category_id: int) -> None:
    """Delete a category that no product uses; otherwise the admin can only hide it.

    Locking the category row makes a concurrent product insert, which takes a shared
    lock on its parent row, wait until this check and the delete are done.
    """
    with transaction.atomic():
        category = Category.objects.select_for_update(of=('self',)).get(id=category_id)
        if category.products.exists():
            raise UnprocessableEntityError(
                'Danh mục đang có sản phẩm nên không thể xóa, bạn có thể ẩn danh mục',
                code='RESOURCE_IN_USE',
            )
        category.delete()
