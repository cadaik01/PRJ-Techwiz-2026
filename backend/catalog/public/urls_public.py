"""
Module: catalog.public.urls_public
Description: /api/public/ routes of the catalog app.
"""

from django.urls import path

from catalog.public.views_public import CategoryPublicListView

urlpatterns = [
    path('categories/', CategoryPublicListView.as_view(), name='public-category-list'),
]
