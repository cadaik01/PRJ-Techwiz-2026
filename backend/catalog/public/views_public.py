"""
Module: catalog.public.views_public
Description: Public catalog endpoints, open to guests and every role (Pass 4B §4.2):
             PU-02 categories, PU-10 -> PU-12 products (FR-14, FR-15, FR-27, G-04, G-05).
"""

from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from catalog.models import Category
from catalog.public.products import IN_STOCK, public_products
from catalog.public.serializers_public import CategoryReadSerializer, ProductCardSerializer, ProductDetailSerializer
from core.exceptions import BusinessValidationError
from core.utils import api_response
from manager.pagination import ContractPagination
from markets.public.views_public import day_param
from reviews.models import ProductReview
from reviews.public.pagination import ReviewPagination
from reviews.public.serializers_public import ReviewPublicSerializer, rating_summary


class CategoryPublicListView(APIView):
    """PU-02: active categories only, unpaginated (home page, catalog filter, product form)."""

    permission_classes = [AllowAny]

    def get(self, request):
        data = CategoryReadSerializer(Category.objects.filter(is_active=True), many=True).data
        return api_response(message='Lấy danh sách danh mục thành công', data=data, request=request)


MAX_IDS = 50
PRODUCT_ORDERINGS = {
    'newest': ('-created_at', '-id'),
    'price_asc': ('price', 'id'),
    'price_desc': ('-price', 'id'),
    # MySQL sorts NULL first on DESC too; unrated products go last.
    'rating': (F('rating_avg').desc(nulls_last=True), '-rating_count', '-id'),
}


def _int_list(raw: str, field: str, *, limit: int | None = None) -> list[int]:
    values = [value.strip() for value in raw.split(',') if value.strip()]
    if not all(value.isdigit() for value in values):
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors={field: ['Danh sách mã không hợp lệ']})
    if limit and len(values) > limit:
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors={field: [f'Tối đa {limit} mã']})
    return [int(value) for value in values]


def _price(params, field: str) -> int | None:
    raw = params.get(field, '').strip()
    if not raw:
        return None
    if not raw.isdigit():
        raise BusinessValidationError('Dữ liệu không hợp lệ', errors={field: ['Giá phải là số nguyên']})
    return int(raw)


class ProductPublicListView(APIView):
    """PU-10: `q`, `category` (ids), `market_id`, `day`, `farmer_id`, `price_min`, `price_max`,
    `in_stock` (default true), `ids` (≤ 50, cart refresh), `ordering` = newest | price_asc | price_desc | rating.

    With `ids`, out-of-stock and paused products come back too (in_stock is ignored) so the
    cart can mark them; archived or removed ones never do (Pass 4B §4.2).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        params = request.query_params
        ordering = params.get('ordering', '').strip() or 'newest'
        if ordering not in PRODUCT_ORDERINGS:
            raise BusinessValidationError('Dữ liệu không hợp lệ', errors={'ordering': ['Kiểu sắp xếp không hợp lệ']})
        queryset = public_products(request.user)

        if ids := _int_list(params.get('ids', ''), 'ids', limit=MAX_IDS):
            queryset = queryset.filter(id__in=ids)
        elif params.get('in_stock', 'true').strip().lower() != 'false':
            queryset = queryset.filter(IN_STOCK)
        if q := params.get('q', '').strip():
            queryset = queryset.filter(name__icontains=q)
        if categories := _int_list(params.get('category', ''), 'category'):
            queryset = queryset.filter(category_id__in=categories, category__is_active=True)
        if farmer_id := _int_list(params.get('farmer_id', ''), 'farmer_id'):
            queryset = queryset.filter(farmer_id__in=farmer_id)
        if (price_min := _price(params, 'price_min')) is not None:
            queryset = queryset.filter(price__gte=price_min)
        if (price_max := _price(params, 'price_max')) is not None:
            queryset = queryset.filter(price__lte=price_max)
        market_ids, day = _int_list(params.get('market_id', ''), 'market_id'), day_param(params)
        if market_ids or day is not None:
            # One filter() call so the market and the day refer to the same active slot.
            slot = Q(farmer__farmer_markets__market__is_active=True,
                     farmer__farmer_markets__pickup_slots__is_active=True)
            if market_ids:
                slot &= Q(farmer__farmer_markets__market_id__in=market_ids)
            if day is not None:
                slot &= Q(farmer__farmer_markets__pickup_slots__day_of_week=day)
            queryset = queryset.filter(slot)
        queryset = queryset.distinct().order_by(*PRODUCT_ORDERINGS[ordering])

        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            ProductCardSerializer(page, many=True, context={'request': request}).data,
        )


class ProductPublicDetailView(APIView):
    """PU-11: out-of-stock or paused products still open; archived, removed or non-public farmer is 404."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        product = get_object_or_404(public_products(request.user), pk=pk)
        data = ProductDetailSerializer(product, context={'request': request}).data
        return api_response(message='Lấy thông tin sản phẩm thành công', data=data, request=request)


class ProductPublicReviewsView(APIView):
    """PU-12: visible reviews of the product, 10 per page, `rating` filter; summary ignores the filter."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        get_object_or_404(public_products(), pk=pk)
        visible = ProductReview.objects.filter(order_item__product_id=pk, is_hidden_by_admin=False)
        reviews = visible.select_related('order_item__order__customer__customer_profile') \
            .order_by('-created_at', '-id')
        if rating := request.query_params.get('rating', '').strip():
            if rating not in {'1', '2', '3', '4', '5'}:
                raise BusinessValidationError('Dữ liệu không hợp lệ', errors={'rating': ['Số sao từ 1 đến 5']})
            reviews = reviews.filter(rating=int(rating))
        paginator = ReviewPagination(rating_summary(visible))
        page = paginator.paginate_queryset(reviews, request, view=self)
        return paginator.get_paginated_response(ReviewPublicSerializer(page, many=True).data)
