from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from marketlink_core.responses import api_response


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            database = "ok"
        except Exception:
            database = "error"

        healthy = database == "ok"
        return api_response(
            message="OK" if healthy else "Database is unreachable",
            data={"status": "ok", "database": database, "time": timezone.localtime()},
            status_code=200 if healthy else 503,
            request=request,
        )
