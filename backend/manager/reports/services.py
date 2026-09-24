"""
Module: manager.reports.services
Description: Reports over a pickup-date range (FR-55, AD-25, AD-26, D-018, screen A-09).

Orders are selected by pickup_date, a plain DATE, which is what the
orders_market_report_idx (market, status, pickup_date) index serves. Revenue counts
COMPLETED orders only (A-002 §4).
"""

from datetime import date

from django.db.models import Avg, Count, OuterRef, QuerySet, Subquery, Sum

from manager.common.products import rounded_rating
from manager.dashboard.services import orders_by_status
from marketlink_core.exceptions import BusinessValidationError
from markets.models import Market
from orders.models import Order, OrderStatus
from reviews.models import FarmerReview

MAX_RANGE_DAYS = 366
TOP_FARMERS = 10


def report_filters(params) -> dict:
    """`from` and `to` (required, YYYY-MM-DD, at most 366 days) and optional `market_id`."""
    raw = {field: (params.get(field) or '').strip() for field in ('from', 'to')}
    errors = {field: ['Vui lòng chọn ngày'] for field, value in raw.items() if not value}
    days = {}
    for field, value in raw.items():
        if value:
            try:
                days[field] = date.fromisoformat(value)
            except ValueError:
                errors[field] = ['Ngày không hợp lệ (định dạng YYYY-MM-DD)']
    market_id = (params.get('market_id') or '').strip()
    if market_id and not (market_id.isdigit() and Market.objects.filter(id=int(market_id)).exists()):
        errors['market_id'] = ['Chợ không tồn tại']
    if not errors and days['to'] < days['from']:
        errors['to'] = ['Ngày kết thúc phải từ ngày bắt đầu trở đi']
    if not errors and (days['to'] - days['from']).days + 1 > MAX_RANGE_DAYS:
        errors['to'] = [f'Khoảng ngày tối đa {MAX_RANGE_DAYS} ngày']
    if errors:
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors=errors)
    return {'date_from': days['from'], 'date_to': days['to'], 'market_id': int(market_id) if market_id else None}


def _orders(*, date_from: date, date_to: date, market_id: int | None) -> QuerySet[Order]:
    orders = Order.objects.filter(pickup_date__gte=date_from, pickup_date__lte=date_to)
    return orders.filter(market_id=market_id) if market_id else orders


def build_report(*, date_from: date, date_to: date, market_id: int | None = None) -> dict:
    orders = _orders(date_from=date_from, date_to=date_to, market_id=market_id)
    completed = orders.filter(status=OrderStatus.COMPLETED).order_by()

    revenue_by_market = [
        {'market_id': row['market_id'], 'market_name': row['market__name'],
         'completed_orders': row['completed_orders'], 'revenue': int(row['revenue'])}
        for row in completed.values('market_id', 'market__name')
        .annotate(completed_orders=Count('id'), revenue=Sum('total_amount'))
        .order_by('-revenue', 'market__name')
    ]

    # Rating is the farmer's overall rating (visible reviews), not limited to the range.
    rating = FarmerReview.objects.filter(order__farmer_id=OuterRef('farmer_id'), is_hidden_by_admin=False) \
        .order_by().values('order__farmer_id').annotate(avg=Avg('rating')).values('avg')
    top_farmers = [
        {'farmer_id': row['farmer_id'], 'stall_name': row['farmer__stall_name'],
         'completed_orders': row['completed_orders'], 'revenue': int(row['revenue']),
         'rating_avg': rounded_rating(row['rating_avg'])}
        for row in completed.values('farmer_id', 'farmer__stall_name')
        .annotate(completed_orders=Count('id'), revenue=Sum('total_amount'), rating_avg=Subquery(rating))
        .order_by('-completed_orders', '-revenue', 'farmer__stall_name')[:TOP_FARMERS]
    ]
    return {
        'orders_by_status': orders_by_status(orders),
        'revenue_by_market': revenue_by_market,
        'top_farmers': top_farmers,
    }
