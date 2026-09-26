from django.urls import path

from reviews.customer.views_customer import FarmerReviewView, ProductReviewView

urlpatterns = [
    path("orders/<int:order_id>/farmer-review/", FarmerReviewView.as_view(), name="customer-farmer-review"),
    path("orders/<int:order_id>/items/<int:item_id>/review/", ProductReviewView.as_view(),
         name="customer-product-review"),
]
