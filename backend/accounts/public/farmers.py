"""
Module: accounts.public.farmers
Description: Farmers as the public sees them (Pass 4B §3.2 `FarmerSummary`, §6.2):
             APPROVED with an active account.
"""

from django.db.models import (
    Avg,
    Count,
    Exists,
    FloatField,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Subquery,
)
from django.db.models.functions import Coalesce

from accounts.models import FarmerProfile, FarmerStatus
from catalog.models import Product
from favorites.models import FavoriteFarmer
from marketlink_core.policies.roles import RoleCode
from markets.models import FarmerMarket, PickupSlot
from reviews.models import FarmerReview

PUBLIC_FARMER = Q(status=FarmerStatus.APPROVED, user__is_active=True)


def _per_farmer(queryset, group_by: str, expression, output_field):
    """Scalar subquery grouped by the farmer key; NULL when the farmer has no rows."""
    return Subquery(
        queryset.order_by().values(group_by).annotate(value=expression).values('value'),
        output_field=output_field,
    )


def is_customer(user) -> bool:
    return bool(user and user.is_authenticated and user.role.code == RoleCode.CUSTOMER)


def public_farmers(user=None) -> QuerySet[FarmerProfile]:
    """FarmerSummary rows with ratings, in-stock count, favorite flag and markets prefetched."""
    reviews = FarmerReview.objects.filter(order__farmer=OuterRef('pk'), is_hidden_by_admin=False)
    in_stock = Product.objects.filter(
        farmer=OuterRef('pk'), is_archived=False, is_hidden_by_admin=False, is_available=True, stock_quantity__gt=0,
    )
    queryset = (
        FarmerProfile.objects.filter(PUBLIC_FARMER)
        .select_related('user')
        .annotate(
            rating_avg=_per_farmer(reviews, 'order__farmer', Avg('rating'), FloatField()),
            rating_count=Coalesce(_per_farmer(reviews, 'order__farmer', Count('id'), IntegerField()), 0),
            in_stock_product_count=Coalesce(_per_farmer(in_stock, 'farmer', Count('id'), IntegerField()), 0),
        )
        .prefetch_related(Prefetch(
            'farmer_markets',
            queryset=FarmerMarket.objects.filter(market__is_active=True).select_related('market').prefetch_related(
                Prefetch('pickup_slots', queryset=PickupSlot.objects.filter(is_active=True)),
            ).order_by('market__name'),
        ))
    )
    if is_customer(user):
        favorite = FavoriteFarmer.objects.filter(customer=user, farmer=OuterRef('pk'))
        queryset = queryset.annotate(is_favorite=Exists(favorite))
    return queryset
