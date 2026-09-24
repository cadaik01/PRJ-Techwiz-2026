from django.core.cache import caches
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from marketlink_core.exceptions import ErrorCode
from marketlink_core.responses import api_response


def _database_status() -> str:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # noqa: BLE001 - any failure means the database is unreachable
        return "error"
    return "ok"


def _cache_status() -> str:
    try:
        cache = caches["default"]
        cache.set("health:ping", "ok", 5)
        return "ok" if cache.get("health:ping") == "ok" else "error"
    except Exception:  # noqa: BLE001 - report the cache as down instead of failing the probe
        return "error"


# No auth or throttling so uptime monitors are never rejected; only the database decides 200 vs 503.
class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []

    def get(self, request):
        database = _database_status()
        data = {
            "status": "ok" if database == "ok" else "error",
            "database": database,
            "cache": _cache_status(),
            "time": timezone.localtime().isoformat(),
        }
        if database == "ok":
            return api_response(message="OK", data=data, request=request)
        return api_response(
            message="Service unavailable.",
            data=data,
            status_code=503,
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            request=request,
        )
