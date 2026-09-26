from accounts.selectors import farmer_closure_map, farmer_market_rows
from favorites.selectors import favorite_ids


def farmer_context(request, farmers, *, market_id: int | None = None) -> dict:
    ids = [farmer.pk for farmer in farmers]
    return {
        "markets": farmer_market_rows(farmer_ids=ids),
        "closures": farmer_closure_map(farmer_ids=ids),
        "favorite_farmer_ids": favorite_ids(
            user=getattr(request, "user", None), kind="farmer", object_ids=ids
        ),
        # PU-05 shows only the stall label of the market being browsed.
        "only_market_id": market_id,
    }
