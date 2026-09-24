"""
Module: marketlink_core.public.views_public
Description: PU-01, the limits the frontend needs before any call (Pass 4B §4.2).
"""

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from marketlink_core.utils import api_response

# Defaults frozen by the contract (U-01, D-005, Pass 3 §1.5); settings may override them.
DEFAULTS = {
    'BOOKING_HORIZON_DAYS': 7,
    'MAX_OPEN_ORDERS_TOTAL': 5,
    'MAX_OPEN_ORDERS_PER_FARMER': 1,
    'MAX_UPLOAD_MB': 2,
}


def _setting(name):
    return getattr(settings, name, DEFAULTS[name])


class PublicConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        data = {
            'ai_chat_enabled': bool(getattr(settings, 'AI_CHAT_ENABLED', False)),
            'booking_horizon_days': _setting('BOOKING_HORIZON_DAYS'),
            'max_open_orders_total': _setting('MAX_OPEN_ORDERS_TOTAL'),
            'max_open_orders_per_farmer': _setting('MAX_OPEN_ORDERS_PER_FARMER'),
            'max_upload_mb': _setting('MAX_UPLOAD_MB'),
        }
        return api_response(message='OK', data=data, request=request)
