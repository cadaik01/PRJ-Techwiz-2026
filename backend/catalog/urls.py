"""
Module: catalog.urls
Description: Gathers the catalog role branches for config/urls.py, mounted under /api/.
             Admin routes live in the manager app.
"""

from django.urls import include, path

urlpatterns = [
    path('public/', include('catalog.public.urls_public')),
]
