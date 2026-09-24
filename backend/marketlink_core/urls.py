"""
Module: marketlink_core.urls
Description: Root URLconf. Django admin sits at /django-admin/ so it never shadows the
             /api/admin/ branch (Pass 4B §1.1, API-07).
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema", permission_classes=[AllowAny]),
        name="api-docs",
    ),
    path("api/admin/", include("manager.urls")),
    path("api/public/", include("catalog.public.urls_public")),
    path("api/public/", include("markets.public.urls_public")),
    path("api/public/", include("accounts.public.urls_public")),
    path("api/public/", include("notifications.public.urls_public")),
    path("api/public/", include("marketlink_core.public.urls_public")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
