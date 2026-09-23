"""
Module: core.pagination
Description: StandardPagination - page_size 20, with count/next/previous/results
             inside the envelope's `data`.
"""

from rest_framework.pagination import PageNumberPagination

from core.utils import api_response


class StandardPagination(PageNumberPagination):
    page_size = 20
    message = 'Lấy danh sách thành công'

    def get_paginated_response(self, data):
        return api_response(
            message=self.message,
            request=self.request,
            data={
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
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
                'data': super().get_paginated_response_schema(schema),
                'errors': {'type': 'object'},
            },
        }
