from django.db.models import Count, Prefetch

from orders.models import Order, OrderItem, OrderStatus, OrderStatusHistory

# C-04 "Open" tab; every other status is "History".
OPEN_TAB = (OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.READY_FOR_PICKUP)


def order_summary_queryset(order_ids):
    """Everything OrderSummaryReadSerializer reads, in a single query."""
    return (
        Order.objects.filter(pk__in=order_ids)
        .select_related("customer__customer_profile", "farmer", "market")
        .annotate(item_count=Count("items"))
        .order_by("id")
    )


def customer_orders_queryset(customer, *, tab=None, status=None, farmer_id=None, pickup_from=None,
                             pickup_to=None, ordering=None):
    """CU-05: the customer's own orders, filtered; C-04 default order depends on the tab."""
    orders = (
        Order.objects.filter(customer=customer)
        .select_related("customer__customer_profile", "farmer", "market")
        .annotate(item_count=Count("items"))
    )
    if tab == "open":
        orders = orders.filter(status__in=OPEN_TAB)
    elif tab == "history":
        orders = orders.exclude(status__in=OPEN_TAB)
    if status:
        orders = orders.filter(status__in=status)
    if farmer_id:
        orders = orders.filter(farmer_id=farmer_id)
    if pickup_from:
        orders = orders.filter(pickup_date__gte=pickup_from)
    if pickup_to:
        orders = orders.filter(pickup_date__lte=pickup_to)
    ordering = ordering or ("pickup_start_at" if tab == "open" else "-created_at")
    return orders.order_by(ordering, "-id" if ordering.startswith("-") else "id")


def customer_order_detail(customer, order_id) -> Order | None:
    """CU-06: one of the customer's own orders with everything OrderDetail reads; None if not theirs."""
    return (
        Order.objects.filter(pk=order_id, customer=customer)
        .select_related("customer__customer_profile", "farmer", "market", "farmer_review")
        .annotate(item_count=Count("items"))
        .prefetch_related(
            Prefetch("items", queryset=OrderItem.objects.select_related("product", "product_review")),
            Prefetch(
                "status_history",
                queryset=OrderStatusHistory.objects.select_related(
                    "actor__farmer_profile", "actor__customer_profile"
                ),
            ),
        )
        .first()
    )
