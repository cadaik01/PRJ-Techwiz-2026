"""
Module: manager.customers.urls_admin
Description: /api/admin/customers/ routes (AD-09 -> AD-13).
"""

from django.urls import path

from manager.customers.views_admin import (
    CustomerActivateView,
    CustomerAdminDetailView,
    CustomerAdminListView,
    CustomerDeactivateView,
    CustomerDeactivationImpactView,
)

urlpatterns = [
    path('customers/', CustomerAdminListView.as_view(), name='admin-customer-list'),
    path('customers/<int:pk>/', CustomerAdminDetailView.as_view(), name='admin-customer-detail'),
    path('customers/<int:pk>/deactivation-impact/', CustomerDeactivationImpactView.as_view(),
         name='admin-customer-deactivation-impact'),
    path('customers/<int:pk>/deactivate/', CustomerDeactivateView.as_view(), name='admin-customer-deactivate'),
    path('customers/<int:pk>/activate/', CustomerActivateView.as_view(), name='admin-customer-activate'),
]
