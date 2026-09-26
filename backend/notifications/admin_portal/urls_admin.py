from django.urls import path

from notifications.admin_portal.views_admin import (
    AnnouncementDetailView,
    AnnouncementListCreateView,
)

urlpatterns = [
    path(
        "admin/announcements/",
        AnnouncementListCreateView.as_view(),
        name="admin-announcement-list",
    ),
    path(
        "admin/announcements/<int:id>/",
        AnnouncementDetailView.as_view(),
        name="admin-announcement-detail",
    ),
]
