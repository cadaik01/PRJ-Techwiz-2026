from django.db.models import Count

from orders.models import Order


def order_summary_queryset(order_ids):
    """Everything OrderSummaryReadSerializer reads, in a single query."""
    return (
        Order.objects.filter(pk__in=order_ids)
        .select_related("customer__customer_profile", "farmer", "market")
        .annotate(item_count=Count("items"))
        .order_by("id")
    )
