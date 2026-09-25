from django.urls import path

from orders.customer.views_customer import CustomerOrderCancelView, CustomerOrderDetailView, CustomerOrdersView

urlpatterns = [
    path("orders/", CustomerOrdersView.as_view(), name="customer-orders"),
    path("orders/<int:order_id>/", CustomerOrderDetailView.as_view(), name="customer-order-detail"),
    path("orders/<int:order_id>/cancel/", CustomerOrderCancelView.as_view(), name="customer-order-cancel"),
]
