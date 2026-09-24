from rest_framework.response import Response

from marketlink_core.context import get_request_id
from marketlink_core.messages import default_message


def api_response(data=None, message: str | None = None, status: int = 200, headers=None) -> Response:
    body = {
        "success": True,
        "message": message or default_message("OK"),
        "request_id": get_request_id(),
        "data": {} if data is None else data,
        "errors": {},
    }
    return Response(body, status=status, headers=headers)


def error_body(code: str, message: str, errors: dict | None = None, data: dict | None = None) -> dict:
    return {
        "success": False,
        "message": message,
        "code": code,
        "request_id": get_request_id(),
        "data": data or {},
        "errors": errors or {},
    }
