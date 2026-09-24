from rest_framework.pagination import PageNumberPagination

from marketlink_core.responses import api_response


class StandardPagination(PageNumberPagination):
    page_size = 20

    def get_paginated_response(self, data):
        page = self.page
        return api_response(
            data={
                "count": page.paginator.count,
                "page": page.number,
                "page_size": page.paginator.per_page,
                "total_pages": page.paginator.num_pages,
                "next": page.next_page_number() if page.has_next() else None,
                "previous": page.previous_page_number() if page.has_previous() else None,
                "results": data,
            }
        )
