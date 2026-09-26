from django.urls import include, path

# accounts/urls.py is mounted under /api/auth/ for AU-09, so the farmer and customer admin
# routes need their own module mounted at /api/ to land on /api/admin/.
urlpatterns = [
    path("", include("accounts.admin_portal.urls_admin_people")),
]
