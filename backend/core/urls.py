"""
Module: core.urls
Description: Root URLconf. Mounts every app under /api/ and exposes the OpenAPI schema.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.static import serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from django.urls import re_path

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('accounts.urls')),
    path('api/notifications/', include('notifications.urls')),
    # Mount the SRS apps here, for example:
    # path('api/', include('orders.urls')),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve uploaded files locally during development only. Anything sensitive must go
# through a view that checks object-level permissions, not through this handler.
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
