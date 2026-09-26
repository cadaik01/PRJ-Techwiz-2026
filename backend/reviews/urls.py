from django.urls import include, path

urlpatterns = [
    path("", include("reviews.admin_portal.urls_admin")),
]
