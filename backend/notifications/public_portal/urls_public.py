from django.urls import path

from notifications.public_portal.views_public import PublicAnnouncementListView

urlpatterns = [
    path(
        "public/announcements/",
        PublicAnnouncementListView.as_view(),
        name="public-announcement-list",
    ),
]
