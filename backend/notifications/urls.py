from django.urls import include, path

urlpatterns = [
    path("", include("notifications.admin_portal.urls_admin")),
    path("", include("notifications.public_portal.urls_public")),
]
