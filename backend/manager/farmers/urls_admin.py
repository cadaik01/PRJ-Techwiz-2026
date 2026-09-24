"""
Module: manager.farmers.urls_admin
Description: /api/admin/farmers/ routes (AD-02 -> AD-08).
"""

from django.urls import path

from manager.farmers.views_admin import (
    FarmerAdminDetailView,
    FarmerAdminListView,
    FarmerStatusActionView,
    FarmerSuspensionImpactView,
)

urlpatterns = [
    path('farmers/', FarmerAdminListView.as_view(), name='admin-farmer-list'),
    path('farmers/<int:pk>/', FarmerAdminDetailView.as_view(), name='admin-farmer-detail'),
    path('farmers/<int:pk>/suspension-impact/', FarmerSuspensionImpactView.as_view(),
         name='admin-farmer-suspension-impact'),
    *[
        path(f'farmers/<int:pk>/{action}/', FarmerStatusActionView.as_view(action=action),
             name=f'admin-farmer-{action}')
        for action in FarmerStatusActionView.ACTIONS
    ],
]
