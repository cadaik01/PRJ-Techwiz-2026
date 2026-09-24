"""
Module: catalog.public.products
Description: Products as the public sees them (Pass 4B §3.3 `ProductCard`, §6.2):
             not archived, not hidden by admin, sold by a public farmer.
"""

from django.db.models import Avg, Count, Exists, OuterRef, Prefetch, Q, QuerySet

from accounts.models import FarmerStatus
from accounts.public.farmers import is_customer
from catalog.models import Product
from favorites.models import FavoriteProduct
from markets.models import FarmerMarket, PickupSlot

# Same farmer condition as accounts.public.farmers.PUBLIC_FARMER, seen from the product.
VISIBLE_PRODUCT = Q(
    is_archived=False, is_hidden_by_admin=False,
    farmer__status=FarmerStatus.APPROVED, farmer__user__is_active=True,
)
IN_STOCK = Q(stock_quantity__gt=0, is_available=True)
VISIBLE_REVIEW = Q(order_items__product_review__is_hidden_by_admin=False)


def public_products(user=None) -> QuerySet[Product]:
    queryset = (
        Product.objects.filter(VISIBLE_PRODUCT)
        .select_related('category', 'farmer')
        .annotate(
            # A later market/day filter joins slots and repeats each review row; the average
            # is unchanged by that, the count needs distinct.
            rating_avg=Avg('order_items__product_review__rating', filter=VISIBLE_REVIEW),
            rating_count=Count('order_items__product_review', filter=VISIBLE_REVIEW, distinct=True),
        )
        .prefetch_related(Prefetch(
            'farmer__farmer_markets',
            queryset=FarmerMarket.objects.filter(market__is_active=True).select_related('market').prefetch_related(
                Prefetch('pickup_slots', queryset=PickupSlot.objects.filter(is_active=True)),
            ).order_by('market__name'),
        ))
    )
    if is_customer(user):
        queryset = queryset.annotate(
            is_favorite=Exists(FavoriteProduct.objects.filter(customer=user, product=OuterRef('pk'))),
        )
    return queryset
