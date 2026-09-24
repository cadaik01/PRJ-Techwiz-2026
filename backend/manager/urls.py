"""
Module: manager.urls
Description: Every /api/admin/ route, one include per module.
"""

from django.urls import include, path

urlpatterns = [
    path('', include('manager.categories.urls_admin')),
    path('', include('manager.markets.urls_admin')),
    path('', include('manager.announcements.urls_admin')),
]
