from django.urls import include, path

# accounts/urls.py is mounted under /api/auth/, so the public farmer routes need their own
# module mounted at /api/ to land on /api/public/farmers/.
urlpatterns = [
    path("", include("accounts.public_portal.urls_public")),
]
