"""
Module: accounts.urls
Description: Mounts every accounts route under /api/auth/.
"""

from django.urls import include, path

urlpatterns = [
    path('', include('accounts.auth.urls_auth')),
]
