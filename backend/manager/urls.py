"""
Module: manager.urls
Description: Every /api/admin/ route, one include per module.
"""

from django.urls import include, path

urlpatterns = [
    path('', include('manager.categories.urls_admin')),
    path('', include('manager.markets.urls_admin')),
    path('', include('manager.announcements.urls_admin')),
    path('', include('manager.audit_logs.urls_admin')),
    path('', include('manager.customers.urls_admin')),
    path('', include('manager.farmers.urls_admin')),
    path('', include('manager.moderation.urls_admin')),
]
