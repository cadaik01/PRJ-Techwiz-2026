"""
Module: manager.dashboard.views_admin
Description: AD-01, the admin home (FR-50, screen A-01).
"""

from rest_framework.views import APIView

from accounts.models import FarmerStatus
from manager.dashboard.services import dashboard_totals, orders_by_day, orders_by_status
from manager.farmers.serializers_admin import AdminFarmerRowSerializer
from manager.farmers.services import admin_farmers
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response
from orders.models import Order

PENDING_PREVIEW = 5


class DashboardAdminView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        pending = admin_farmers().filter(status=FarmerStatus.PENDING)[:PENDING_PREVIEW]
        data = {
            'totals': dashboard_totals(),
            'orders_by_day': orders_by_day(),
            'orders_by_status': orders_by_status(Order.objects.all()),
            'pending_farmers': AdminFarmerRowSerializer(pending, many=True).data,
        }
        return api_response(message='Dashboard retrieved', data=data, request=request)
