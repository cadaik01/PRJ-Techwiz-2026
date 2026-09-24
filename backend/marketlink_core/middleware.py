import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse

from marketlink_core.context import set_request_id
from marketlink_core.http import normalize_request_id


class RequestIDMiddleware:
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
