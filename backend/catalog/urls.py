from django.urls import include, path

urlpatterns = [
    path("", include("catalog.admin_portal.urls_admin")),
    path("", include("catalog.public_portal.urls_public")),
]
