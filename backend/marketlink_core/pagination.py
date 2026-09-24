from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from marketlink_core.responses import api_response


class StandardPagination(PageNumberPagination):
    """Page-number pagination wrapped in the envelope (Pass 4B §2.2).

    Clients may pick page_size from ALLOWED_PAGE_SIZES only; any other value silently falls
    back to the default so nobody can pull thousands of rows in one call. next/previous are
    page numbers, not URLs.
    """

    page_size = 20
    page_size_query_param = "page_size"
    allowed_page_sizes = (5, 10, 20)
    message = "OK"

    def get_page_size(self, request) -> int:
        raw = request.query_params.get(self.page_size_query_param)
        try:
            requested = int(raw) if raw is not None else None
        except ValueError:
            requested = None
        return requested if requested in self.allowed_page_sizes else self.page_size

    def get_paginated_response(self, data: Any) -> Response:
        page = self.page
        return api_response(
            message=self.message,
            data={
                "count": page.paginator.count,
                "page": page.number,
                "page_size": page.paginator.per_page,
                "total_pages": page.paginator.num_pages,
                "next": page.next_page_number() if page.has_next() else None,
                "previous": page.previous_page_number() if page.has_previous() else None,
                "results": data,
            },
            request=self.request,
        )

    def get_paginated_response_schema(self, schema: dict[str, Any]) -> dict[str, Any]:
        nullable_int = {"type": "integer", "nullable": True}
        return {
            "type": "object",
            "properties": {
                "success": {"type": "boolean", "example": True},
                "message": {"type": "string", "example": "OK"},
                "request_id": {"type": "string", "format": "uuid"},
                "data": {
                    "type": "object",
                    "properties": {
                        "count": {"type": "integer", "example": 134},
                        "page": {"type": "integer", "example": 2},
                        "page_size": {"type": "integer", "example": 20},
                        "total_pages": {"type": "integer", "example": 7},
                        "next": {**nullable_int, "example": 3},
                        "previous": {**nullable_int, "example": 1},
                        "results": schema,
                    },
                },
                "errors": {"type": "object", "example": {}},
            },
        }


class PublicReviewPagination(StandardPagination):
    """Public review lists use 10 items per page (Pass 4B §2.2)."""

    page_size = 10
