from django.urls import path

from accounts.customer.views_customer import CustomerProfileView

urlpatterns = [
    path("profile/", CustomerProfileView.as_view(), name="customer-profile"),
]
