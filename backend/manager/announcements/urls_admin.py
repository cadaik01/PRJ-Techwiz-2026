"""
Module: manager.announcements.urls_admin
Description: /api/admin/announcements/ routes (AD-27, AD-28).
"""

from django.urls import path

from manager.announcements.views_admin import AnnouncementAdminDetailView, AnnouncementAdminListView

urlpatterns = [
    path('announcements/', AnnouncementAdminListView.as_view(), name='admin-announcement-list'),
    path('announcements/<int:pk>/', AnnouncementAdminDetailView.as_view(), name='admin-announcement-detail'),
]
