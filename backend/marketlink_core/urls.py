"""
Module: marketlink_core.urls
Description: Root URLconf. Django admin sits at /django-admin/ so it never shadows the
             /api/admin/ branch (Pass 4B §1.1, API-07).
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('django-admin/', admin.site.urls),

    path('api/admin/', include('manager.urls')),
    path('api/public/', include('catalog.public.urls_public')),
    path('api/public/', include('markets.public.urls_public')),
    path('api/public/', include('accounts.public.urls_public')),
    path('api/public/', include('notifications.public.urls_public')),
    path('api/public/', include('marketlink_core.public.urls_public')),
]

# Serve uploaded files locally during development only.
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
