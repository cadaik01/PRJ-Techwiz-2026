from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from marketlink_core.views import HealthCheckView

# Django Admin lives at /django-admin/ so it never collides with the /api/admin/ branch.
# This branch serves the Admin and Guest scope only; the farmer and customer portals are
# mounted on their own branches.
urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema", permission_classes=[AllowAny]),
        name="api-docs",
    ),
    path("api/auth/", include("accounts.auth.urls")),
    path("api/", include("accounts.admin_urls")),
    path("api/", include("accounts.public_urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("markets.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("reviews.urls")),
    path("api/", include("system.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
