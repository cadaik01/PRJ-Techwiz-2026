from datetime import date

from django.db.models import Avg, Count, Q, Sum
from rest_framework.exceptions import ValidationError
from rest_framework.fields import DateField, IntegerField

from accounts.models import FarmerProfile
from marketlink_core.exceptions import BusinessValidationError
from orders.models import Order, OrderStatus
from system.dashboard import orders_by_status

MAX_RANGE_DAYS = 366
TOP_FARMER_LIMIT = 10
ZERO = "0.00"


def parse_report_range(params) -> tuple[date, date, int | None]:
    # `from` is a Python keyword, so the range cannot be a plain Serializer with that field name.
    errors: dict[str, list[str]] = {}
    parsed: dict[str, date] = {}
    for key in ("from", "to"):
        raw = params.get(key)
        if not raw:
            errors[key] = ["This query parameter is required."]
            continue
        try:
            parsed[key] = DateField().to_internal_value(raw)
        except ValidationError:
            errors[key] = ["Enter a valid date in YYYY-MM-DD format."]

    market_id = None
    raw_market = params.get("market_id")
    if raw_market:
        try:
            market_id = IntegerField().to_internal_value(raw_market)
        except ValidationError:
            errors["market_id"] = ["Enter a valid market id."]

    if errors:
        raise BusinessValidationError("The report range is invalid.", errors=errors)

    date_from, date_to = parsed["from"], parsed["to"]
    if date_to < date_from:
        raise BusinessValidationError(
            "The report range is invalid.",
            errors={"to": ["The end date cannot be earlier than the start date."]},
        )
    if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
        raise BusinessValidationError(
            "The report range is invalid.",
            errors={"to": [f"The range cannot exceed {MAX_RANGE_DAYS} days."]},
        )
    return date_from, date_to, market_id


def _money(value) -> str:
    return f"{value:.2f}" if value is not None else ZERO


def _ratings_for(farmer_ids: list[int]) -> dict[int, float]:
    # A separate query on purpose: adding Avg over farmer reviews to the revenue aggregate
    # would join a second multi-valued relation and multiply the order rows.
    rows = (
        FarmerProfile.objects.filter(user_id__in=farmer_ids)
        .annotate(
            rating_avg=Avg("orders__farmer_review__rating", filter=Q(orders__farmer_review__is_hidden_by_admin=False))
        )
        .values_list("user_id", "rating_avg")
    )
    return {farmer_id: rating for farmer_id, rating in rows if rating is not None}


def report_summary(*, date_from: date, date_to: date, market_id: int | None = None) -> dict:
    # A-09 reports on pickup_date, the day the sale actually happens; the
    # (market_id, status, pickup_date) index exists for exactly this query.
    orders = Order.objects.filter(pickup_date__gte=date_from, pickup_date__lte=date_to)
    if market_id is not None:
        orders = orders.filter(market_id=market_id)
    completed = orders.filter(status=OrderStatus.COMPLETED)

    revenue_by_market = [
        {
            "market_id": row["market_id"],
            "market_name": row["market__name"],
            "completed_orders": row["completed_orders"],
            "revenue": _money(row["revenue"]),
        }
        for row in completed.values("market_id", "market__name")
        .annotate(completed_orders=Count("id"), revenue=Sum("total_amount"))
        .order_by("-revenue", "market__name")
    ]

    farmer_rows = list(
        completed.values("farmer_id", "farmer__stall_name")
        .annotate(completed_orders=Count("id"), revenue=Sum("total_amount"))
        .order_by("-revenue", "farmer__stall_name")[:TOP_FARMER_LIMIT]
    )
    ratings = _ratings_for([row["farmer_id"] for row in farmer_rows])
    top_farmers = [
        {
            "farmer_id": row["farmer_id"],
            "stall_name": row["farmer__stall_name"],
            "completed_orders": row["completed_orders"],
            "revenue": _money(row["revenue"]),
            "rating_avg": round(ratings[row["farmer_id"]], 2)
            if row["farmer_id"] in ratings
            else None,
        }
        for row in farmer_rows
    ]

    return {
        "orders_by_status": orders_by_status(queryset=orders),
        "revenue_by_market": revenue_by_market,
        "top_farmers": top_farmers,
    }
