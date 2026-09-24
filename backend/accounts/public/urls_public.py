"""
Module: accounts.public.urls_public
Description: /api/public/farmers/ routes (PU-06, PU-07, PU-09).
"""

from django.urls import path

from accounts.public.views_public import FarmerPublicDetailView, FarmerPublicListView, FarmerPublicReviewsView

urlpatterns = [
    path('farmers/', FarmerPublicListView.as_view(), name='public-farmer-list'),
    path('farmers/<int:pk>/', FarmerPublicDetailView.as_view(), name='public-farmer-detail'),
    path('farmers/<int:pk>/reviews/', FarmerPublicReviewsView.as_view(), name='public-farmer-reviews'),
]
