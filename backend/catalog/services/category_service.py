from catalog.models import Category
from marketlink_core.exceptions import ErrorCode, UnprocessableEntityError


def delete_category(*, category_id: int) -> None:
    category = Category.objects.get(pk=category_id)
    product_count = category.products.count()
    if product_count:
        raise UnprocessableEntityError(
            "This category still has products. Hide it instead of deleting it.",
            code=ErrorCode.RESOURCE_IN_USE,
            errors={"product_count": [str(product_count)]},
        )
    category.delete()
