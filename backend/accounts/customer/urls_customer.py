from django.urls import path

from accounts.customer.views_customer import CustomerDashboardView, CustomerProfileView

urlpatterns = [
    path("dashboard/", CustomerDashboardView.as_view(), name="customer-dashboard"),
    path("profile/", CustomerProfileView.as_view(), name="customer-profile"),
]
