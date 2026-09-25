from favorites.models import FavoriteFarmer, FavoriteMarket, FavoriteProduct
from marketlink_core.policies.roles import RoleCode

MODELS = {
    "market": (FavoriteMarket, "market_id"),
    "farmer": (FavoriteFarmer, "farmer_id"),
    "product": (FavoriteProduct, "product_id"),
}


def favorite_ids(*, user, kind: str, object_ids) -> set[int] | None:
    # None, not an empty set: is_favorite is null unless a customer is signed in.
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    if getattr(getattr(user, "role", None), "code", None) != RoleCode.CUSTOMER:
        return None
    model, column = MODELS[kind]
    return set(
        model.objects.filter(customer=user, **{f"{column}__in": set(object_ids)}).values_list(
            column, flat=True
        )
    )
