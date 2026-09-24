"""
Module: manager.reports.views_admin
Description: Reports (FR-55, AD-25) and their Excel export (AD-26, CT-19), screen A-09.
"""

from django.http import HttpResponse
from rest_framework.negotiation import BaseContentNegotiation
from rest_framework.views import APIView

from manager.reports.excel import build_workbook
from manager.reports.services import build_report, report_filters
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response, audit_request
from markets.models import Market
from system.models import AuditAction

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


class JSONErrorsNegotiation(BaseContentNegotiation):
    """Ignore Accept: the file is an HttpResponse that skips renderers, and errors are always JSON."""

    def select_parser(self, request, parsers):
        return parsers[0]

    def select_renderer(self, request, renderers, format_suffix=None):
        return renderers[0], renderers[0].media_type


class ReportSummaryView(APIView):
    """AD-25: `from`, `to` (required, ≤ 366 days) and `market_id`."""

    permission_classes = [IsAdmin]

    def get(self, request):
        report = build_report(**report_filters(request.query_params))
        return api_response(message='Lấy báo cáo thành công', data=report, request=request)


class ReportExportView(APIView):
    """AD-26: the only endpoint answering without the envelope when it succeeds (Pass 4B §2.1).

    Errors (bad dates, 403) still come back as JSON envelopes through the exception handler.
    """

    permission_classes = [IsAdmin]
    content_negotiation_class = JSONErrorsNegotiation

    def get(self, request):
        filters = report_filters(request.query_params)
        market = Market.objects.filter(id=filters['market_id']).first() if filters['market_id'] else None
        content = build_workbook(
            build_report(**filters), date_from=filters['date_from'], date_to=filters['date_to'],
            market_name=getattr(market, 'name', None),
        )
        filename = f'marketlink-report-{filters["date_from"]}-{filters["date_to"]}.xlsx'
        response = HttpResponse(content, content_type=XLSX)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        audit_request(
            request, action=AuditAction.EXPORT_DATA, status_code=200, user=request.user,
            details={'report': 'admin_summary', 'from': str(filters['date_from']), 'to': str(filters['date_to']),
                     'market_id': filters['market_id']},
        )
        return response
