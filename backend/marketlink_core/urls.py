from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from marketlink_core.views import HealthCheckView, WebSocketTicketView
from markets.farmer import urls_farmer as farmer_market_urls

# Django Admin lives at /django-admin/ so it never collides with the /api/admin/ branch.
urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    path("api/auth/ws-ticket/", WebSocketTicketView.as_view(), name="ws-ticket"),
    path("api/auth/", include("accounts.auth.urls_auth")),
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema", permission_classes=[AllowAny]),
        name="api-docs",
    ),
    path("api/auth/", include("accounts.auth.urls")),
    path("api/public/", include("orders.public.urls_public")),
    path("api/customer/", include("accounts.customer.urls_customer")),
    path("api/customer/", include("orders.customer.urls_customer")),
    path("api/customer/", include("reviews.customer.urls_customer")),
    path("api/customer/", include("favorites.customer.urls_customer")),
    path("api/farmer/profile/", include("accounts.farmer.urls_farmer")),
    path("api/farmer/markets/", include(farmer_market_urls.market_urlpatterns)),
    path("api/farmer/pickup-slots/", include(farmer_market_urls.pickup_slot_urlpatterns)),
    path("api/farmer/closures/", include(farmer_market_urls.closure_urlpatterns)),
    path("api/farmer/orders/", include("orders.farmer.urls_farmer")),
    path("api/notifications/", include("notifications.urls")),
    path("api/farmer/products/", include("catalog.farmer.urls_farmer")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
