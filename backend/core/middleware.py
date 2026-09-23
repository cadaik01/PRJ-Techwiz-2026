"""
Module: core.middleware
Description: RequestIDMiddleware - reads or generates X-Request-ID and binds it to
             request.id, the response header and core.context for the whole request.
"""

import uuid

from core.context import reset_request_id, set_request_id

HEADER = 'X-Request-ID'


def _clean(raw: str | None) -> str | None:
    """Accept a client-supplied id only if it is a UUID.

    The value is echoed into logs and the audit table, so arbitrary text from the
    client would allow log injection.
    """
    if not raw:
        return None
    try:
        return str(uuid.UUID(raw.strip()))
    except ValueError:
        return None


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = _clean(request.headers.get(HEADER)) or str(uuid.uuid4())
        request.id = request_id
        token = set_request_id(request_id)
        try:
            response = self.get_response(request)
        finally:
            reset_request_id(token)
        response[HEADER] = request_id
        return response
