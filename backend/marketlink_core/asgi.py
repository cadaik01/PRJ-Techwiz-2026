import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketlink_core.settings")

# Django must be set up before anything that imports models (consumers, routing).
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

# P4-BE appends the notification route here, e.g.
# re_path(r"^ws/notifications/$", NotificationConsumer.as_asgi()).
websocket_urlpatterns: list = []

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(websocket_urlpatterns),
    }
)
