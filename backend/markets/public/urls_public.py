"""
Module: markets.public.urls_public
Description: /api/public/markets/ routes (PU-03 -> PU-05).
"""

from django.urls import path

from markets.public.views_public import MarketPublicDetailView, MarketPublicFarmersView, MarketPublicListView

urlpatterns = [
    path('markets/', MarketPublicListView.as_view(), name='public-market-list'),
    path('markets/<int:pk>/', MarketPublicDetailView.as_view(), name='public-market-detail'),
    path('markets/<int:pk>/farmers/', MarketPublicFarmersView.as_view(), name='public-market-farmers'),
]
