"""
Module: manager.reports.urls_admin
Description: /api/admin/reports/ routes (AD-25, AD-26).
"""

from django.urls import path

from manager.reports.views_admin import ReportExportView, ReportSummaryView

urlpatterns = [
    path('reports/summary/', ReportSummaryView.as_view(), name='admin-report-summary'),
    path('reports/export/', ReportExportView.as_view(), name='admin-report-export'),
]
