from django.urls import path

from markets.public_portal.views_public import (
    PublicMarketDetailView,
    PublicMarketFarmerListView,
    PublicMarketListView,
)

urlpatterns = [
    path("public/markets/", PublicMarketListView.as_view(), name="public-market-list"),
    path("public/markets/<int:id>/", PublicMarketDetailView.as_view(), name="public-market-detail"),
    path(
        "public/markets/<int:id>/farmers/",
        PublicMarketFarmerListView.as_view(),
        name="public-market-farmer-list",
    ),
]
