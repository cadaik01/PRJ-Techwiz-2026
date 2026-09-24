"""
Module: marketlink_core.public.urls_public
Description: /api/public/config/ (PU-01).
"""

from django.urls import path

from marketlink_core.public.views_public import PublicConfigView

urlpatterns = [
    path('config/', PublicConfigView.as_view(), name='public-config'),
]
