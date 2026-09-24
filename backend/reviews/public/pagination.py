"""
Module: reviews.public.pagination
Description: Public review lists: 10 per page (Pass 4B §2.2) with the RatingSummary next
             to the page (PU-09, PU-12: `{ summary, results … }`).
"""

from marketlink_core.pagination import PublicReviewPagination


class ReviewPagination(PublicReviewPagination):
    def __init__(self, summary: dict):
        super().__init__()
        self.summary = summary

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data['data'] = {'summary': self.summary, **response.data['data']}
        return response
