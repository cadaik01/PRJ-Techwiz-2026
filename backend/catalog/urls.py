"""
Module: catalog.urls
Description: Gathers the catalog role branches for config/urls.py, mounted under /api/.
"""

from django.urls import include, path

urlpatterns = [
    path('admin/', include('catalog.admin_api.urls_admin')),
    path('public/', include('catalog.public.urls_public')),
]
