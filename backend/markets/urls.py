from django.urls import include, path

urlpatterns = [
    path("", include("markets.admin_portal.urls_admin")),
    path("", include("markets.public_portal.urls_public")),
]
