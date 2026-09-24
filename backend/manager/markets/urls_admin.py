"""
Module: manager.markets.urls_admin
Description: /api/admin/markets/ routes (AD-14 -> AD-17).
"""

from django.urls import path

from manager.markets.views_admin import MarketAdminActivationView, MarketAdminDetailView, MarketAdminListView

urlpatterns = [
    path('markets/', MarketAdminListView.as_view(), name='admin-market-list'),
    path('markets/<int:pk>/', MarketAdminDetailView.as_view(), name='admin-market-detail'),
    path('markets/<int:pk>/activate/', MarketAdminActivationView.as_view(is_active=True),
         name='admin-market-activate'),
    path('markets/<int:pk>/deactivate/', MarketAdminActivationView.as_view(is_active=False),
         name='admin-market-deactivate'),
]
