"""
Module: manager.pagination
Description: Pagination shape of the frozen API contract (MarketLink Pass 4B §2.2):
             page numbers instead of links, plus page, page_size and total_pages.

core.pagination still returns next/previous as URLs; admin and public lists use this
class so they match the contract without changing the shared layer other members
depend on.
"""

from rest_framework.pagination import PageNumberPagination

from core.utils import api_response


class ContractPagination(PageNumberPagination):
    page_size = 20
    message = 'Lấy danh sách thành công'

    def get_paginated_response(self, data):
        page = self.page
        return api_response(
            message=self.message,
            request=self.request,
            data={
                'count': page.paginator.count,
                'page': page.number,
                'page_size': self.page_size,
                'total_pages': page.paginator.num_pages,
                'next': page.next_page_number() if page.has_next() else None,
                'previous': page.previous_page_number() if page.has_previous() else None,
                'results': data,
            },
        )

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'message': {'type': 'string'},
                'request_id': {'type': 'string'},
                'data': {
                    'type': 'object',
                    'properties': {
                        'count': {'type': 'integer'},
                        'page': {'type': 'integer'},
                        'page_size': {'type': 'integer'},
                        'total_pages': {'type': 'integer'},
                        'next': {'type': 'integer', 'nullable': True},
                        'previous': {'type': 'integer', 'nullable': True},
                        'results': schema,
                    },
                },
                'errors': {'type': 'object'},
            },
        }
