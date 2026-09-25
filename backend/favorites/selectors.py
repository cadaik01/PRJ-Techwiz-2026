from accounts.models import CustomUser
from favorites.models import FavoriteFarmer, FavoriteMarket, FavoriteProduct


def favorite_ids(customer) -> dict[str, list[int]]:
    """CU-12: ids the frontend uses to fill every heart icon."""
    return {
        "farmer_ids": list(FavoriteFarmer.objects.filter(customer=customer).values_list("farmer_id", flat=True)),
        "product_ids": list(FavoriteProduct.objects.filter(customer=customer).values_list("product_id", flat=True)),
        "market_ids": list(FavoriteMarket.objects.filter(customer=customer).values_list("market_id", flat=True)),
    }


def get_restock_subscribers(product_id: int):
    """Customers to notify with RESTOCK when a Farmer restocks the product from 0 (FA-14, FA-18 — D-025, §5.5).

    Locked accounts are skipped. Returns a CustomUser queryset; pass each one to notify(recipient=...).
    """
    return CustomUser.objects.filter(
        favorite_products__product_id=product_id, is_active=True
    ).order_by("pk")
