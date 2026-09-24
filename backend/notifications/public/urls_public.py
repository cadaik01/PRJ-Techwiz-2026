"""
Module: notifications.public.urls_public
Description: /api/public/ routes of the notifications app.
"""

from django.urls import path

from notifications.public.views_public import AnnouncementPublicListView

urlpatterns = [
    path('announcements/', AnnouncementPublicListView.as_view(), name='public-announcement-list'),
]
