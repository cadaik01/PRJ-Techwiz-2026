"""
Module: manager.markets.urls_admin
Description: /api/admin/markets/ and /api/admin/market-closures/ routes (AD-14 -> AD-17, AD-31 -> AD-33).
"""

from django.urls import path

from manager.markets.views_admin import (
    MarketAdminActivationView,
    MarketAdminDetailView,
    MarketAdminListView,
    MarketClosureDetailView,
    MarketClosureListView,
)

urlpatterns = [
    path('markets/', MarketAdminListView.as_view(), name='admin-market-list'),
    path('markets/<int:pk>/', MarketAdminDetailView.as_view(), name='admin-market-detail'),
    path('markets/<int:pk>/activate/', MarketAdminActivationView.as_view(is_active=True),
         name='admin-market-activate'),
    path('markets/<int:pk>/deactivate/', MarketAdminActivationView.as_view(is_active=False),
         name='admin-market-deactivate'),
    path('markets/<int:pk>/closures/', MarketClosureListView.as_view(), name='admin-market-closures'),
    path('market-closures/<int:pk>/', MarketClosureDetailView.as_view(), name='admin-market-closure-detail'),
]
