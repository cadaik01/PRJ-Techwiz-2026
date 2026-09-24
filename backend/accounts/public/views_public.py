"""
Module: accounts.public.views_public
Description: Public farmer directory and profile (FR-12, FR-13, FR-27, PU-06, PU-07,
             PU-09, screens G-06, G-13).
"""

from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from accounts.public.farmers import public_farmers
from accounts.public.serializers_public import FarmerPublicSerializer, FarmerSummarySerializer
from marketlink_core.exceptions import BusinessValidationError
from marketlink_core.pagination import StandardPagination
from marketlink_core.responses import api_response
from markets.public.geo import distance_km, read_point
from markets.public.views_public import day_param
from reviews.models import FarmerReview
from reviews.public.pagination import ReviewPagination
from reviews.public.serializers_public import ReviewPublicSerializer, rating_summary

ORDERINGS = {
    'name': ('stall_name',),
    # MySQL sorts NULL first on ASC; farmers without ratings or coordinates go last.
    'rating': (F('rating_avg').desc(nulls_last=True), '-rating_count', 'stall_name'),
    'in_stock': ('-in_stock_product_count', 'stall_name'),
    'distance': (F('distance_km').asc(nulls_last=True), 'stall_name'),
}


def _id_param(params, name: str) -> int | None:
    raw = params.get(name, '').strip()
    if not raw:
        return None
    if not raw.isdigit():
        raise BusinessValidationError('Invalid data', errors={name: ['Invalid value']})
    return int(raw)


class FarmerPublicListView(APIView):
    """PU-06: `q`, `market_id`, `day`, `category_id`, `lat` + `lng`,
    `ordering` = rating | in_stock | distance (needs lat/lng) | name."""

    permission_classes = [AllowAny]

    def get(self, request):
        params = request.query_params
        point = read_point(params)
        ordering = params.get('ordering', '').strip() or 'name'
        if ordering not in ORDERINGS or (ordering == 'distance' and not point):
            raise BusinessValidationError('Invalid data', errors={'ordering': [
                'Ordering by distance needs a location (lat, lng)' if ordering == 'distance'
                else 'Invalid ordering']})

        queryset = public_farmers(request.user)
        if point:
            queryset = queryset.annotate(distance_km=distance_km(point))
        if q := params.get('q', '').strip():
            queryset = queryset.filter(stall_name__icontains=q)
        market_id, category_id = _id_param(params, 'market_id'), _id_param(params, 'category_id')
        day = day_param(params)
        if market_id is not None or day is not None:
            # One filter() call so the market and the day refer to the same active slot.
            slot = Q(farmer_markets__market__is_active=True)
            if market_id is not None:
                slot &= Q(farmer_markets__market_id=market_id)
            if day is not None:
                slot &= Q(farmer_markets__pickup_slots__day_of_week=day, farmer_markets__pickup_slots__is_active=True)
            queryset = queryset.filter(slot)
        if category_id is not None:
            queryset = queryset.filter(products__category_id=category_id, products__is_archived=False,
                                       products__is_hidden_by_admin=False)
        queryset = queryset.distinct().order_by(*ORDERINGS[ordering])

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            FarmerSummarySerializer(page, many=True, context={'request': request}).data,
        )


class FarmerPublicDetailView(APIView):
    """PU-07: a farmer who is not public (not APPROVED or locked) is 404."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        farmer = get_object_or_404(public_farmers(request.user), pk=pk)
        data = FarmerPublicSerializer(farmer, context={'request': request}).data
        return api_response(message='Farmer profile retrieved', data=data, request=request)


class FarmerPublicReviewsView(APIView):
    """PU-09: visible reviews of the farmer, 10 per page, `rating` filter; summary ignores the filter."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        get_object_or_404(public_farmers(), pk=pk)
        visible = FarmerReview.objects.filter(order__farmer_id=pk, is_hidden_by_admin=False)
        reviews = visible.select_related('order__customer__customer_profile').order_by('-created_at', '-id')
        rating = request.query_params.get('rating', '').strip()
        if rating:
            if rating not in {'1', '2', '3', '4', '5'}:
                raise BusinessValidationError('Invalid data', errors={'rating': ['The rating must be between 1 and 5']})
            reviews = reviews.filter(rating=int(rating))
        paginator = ReviewPagination(rating_summary(visible))
        page = paginator.paginate_queryset(reviews, request, view=self)
        return paginator.get_paginated_response(ReviewPublicSerializer(page, many=True).data)
