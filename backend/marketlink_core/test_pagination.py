"""StandardPagination follows the frozen shape of Pass 4B §2.2."""

from django.test import RequestFactory
from rest_framework.request import Request

from marketlink_core.pagination import StandardPagination


def paginate(page):
    request = Request(RequestFactory().get('/api/admin/x/', {'page': page}))
    paginator = StandardPagination()
    rows = paginator.paginate_queryset(list(range(45)), request)
    return paginator.get_paginated_response(rows).data['data']


def test_middle_page_uses_page_numbers_not_links():
    data = paginate(2)

    assert {key: value for key, value in data.items() if key != 'results'} == {
        'count': 45, 'page': 2, 'page_size': 20, 'total_pages': 3, 'next': 3, 'previous': 1,
    }
    assert data['results'] == list(range(20, 40))


def test_edges_have_null_neighbours():
    assert (paginate(1)['previous'], paginate(3)['next']) == (None, None)
