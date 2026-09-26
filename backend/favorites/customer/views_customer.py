from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from favorites.customer.serializers_customer import (
    FavoriteFarmerWriteSerializer,
    FavoriteMarketWriteSerializer,
    FavoriteProductWriteSerializer,
)
from favorites.selectors import customer_favorite_ids
from favorites.services.favorite_service import add_favorite, remove_favorite
from marketlink_core.permissions import IsCustomer
from marketlink_core.responses import api_response


class FavoriteIdsView(APIView):
    """CU-12."""

    permission_classes = [IsCustomer]

    def get(self, request):
        return api_response(message="Favorites retrieved", data=customer_favorite_ids(request.user), request=request)


class _FavoriteAddView(APIView):
    """POST of CU-14 / CU-16 / CU-17. The GET lists (FarmerSummary, ProductCard, MarketSummary) come later."""

    permission_classes = [IsCustomer]
    kind = ""
    serializer_class = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        field, target_id = next(iter(serializer.validated_data.items()))
        add_favorite(customer=request.user, kind=self.kind, target_id=target_id)
        return api_response(message="Added to favorites", data={field: target_id}, status_code=201, request=request)


class _FavoriteRemoveView(APIView):
    """DELETE of CU-15 / CU-16 / CU-17."""

    permission_classes = [IsCustomer]
    kind = ""

    def delete(self, request, target_id: int):
        remove_favorite(customer=request.user, kind=self.kind, target_id=target_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FavoriteFarmersView(_FavoriteAddView):
    kind, serializer_class = "farmer", FavoriteFarmerWriteSerializer


class FavoriteFarmerView(_FavoriteRemoveView):
    kind = "farmer"


class FavoriteProductsView(_FavoriteAddView):
    kind, serializer_class = "product", FavoriteProductWriteSerializer


class FavoriteProductView(_FavoriteRemoveView):
    kind = "product"


class FavoriteMarketsView(_FavoriteAddView):
    kind, serializer_class = "market", FavoriteMarketWriteSerializer


class FavoriteMarketView(_FavoriteRemoveView):
    kind = "market"
