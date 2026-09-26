from django.urls import path

from orders.public.views_public import PickupOptionsView

urlpatterns = [
    path("farmers/<int:farmer_id>/pickup-options/", PickupOptionsView.as_view(), name="public-pickup-options"),
]
