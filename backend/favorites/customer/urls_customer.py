from django.urls import path

from favorites.customer import views_customer as views

urlpatterns = [
    path("favorite-ids/", views.FavoriteIdsView.as_view(), name="customer-favorite-ids"),
    path("favorite-farmers/", views.FavoriteFarmersView.as_view(), name="customer-favorite-farmers"),
    path("favorite-farmers/<int:target_id>/", views.FavoriteFarmerView.as_view(), name="customer-favorite-farmer"),
    path("favorite-products/", views.FavoriteProductsView.as_view(), name="customer-favorite-products"),
    path("favorite-products/<int:target_id>/", views.FavoriteProductView.as_view(), name="customer-favorite-product"),
    path("favorite-markets/", views.FavoriteMarketsView.as_view(), name="customer-favorite-markets"),
    path("favorite-markets/<int:target_id>/", views.FavoriteMarketView.as_view(), name="customer-favorite-market"),
]
