import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse

from marketlink_core.context import set_request_id
from marketlink_core.http import normalize_request_id


class RequestIDMiddleware:
    """Attach a UUID request_id to request.id, the context var and the X-Request-ID header.

    A client-supplied X-Request-ID is reused only when it is a valid UUID; anything else
    would overflow the CHAR(36) request_id columns and turn a log write into a 500.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = normalize_request_id(request.headers.get("X-Request-ID")) or str(uuid.uuid4())
        request.id = request_id
        set_request_id(request_id)
        try:
            response = self.get_response(request)
        finally:
            set_request_id(None)
        response["X-Request-ID"] = request_id
        return response
