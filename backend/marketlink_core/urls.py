from django.contrib import admin
from django.urls import path

from marketlink_core.views import HealthView

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
]
