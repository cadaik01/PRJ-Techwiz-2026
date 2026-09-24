from django.urls import path

from orders.customer.views_customer import CustomerOrdersView

urlpatterns = [
    path("orders/", CustomerOrdersView.as_view(), name="customer-orders"),
]
