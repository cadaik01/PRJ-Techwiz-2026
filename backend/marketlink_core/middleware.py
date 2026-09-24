import uuid

from marketlink_core.context import set_request_id


def _parse_uuid(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except ValueError:
        return None


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Client-supplied IDs are only trusted when they parse as UUIDs, to keep logs injection-free.
        request_id = _parse_uuid(request.headers.get("X-Request-ID")) or str(uuid.uuid4())
        request.request_id = request_id
        set_request_id(request_id)
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response
