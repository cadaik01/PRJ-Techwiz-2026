"""
Module: core.responses
Description: The single response envelope every endpoint returns.

Success and failure share one shape, so the frontend reads `success` and
`errors` without branching on the status code first.
"""

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_response(*, success=True, message='', data=None, errors=None, status=http_status.HTTP_200_OK):
    """Wrap a payload in the project envelope."""
    return Response(
        {
            'success': success,
            'message': message,
            'data': data if data is not None else {},
            'errors': errors if errors is not None else {},
        },
        status=status,
    )


def _as_errors(detail):
    """Normalise a DRF error detail into {field: [message, ...]}."""
    if isinstance(detail, dict):
        return {
            key: value if isinstance(value, list) else [str(value)]
            for key, value in detail.items()
        }
    if isinstance(detail, list):
        return {'detail': [str(item) for item in detail]}
    return {'detail': [str(detail)]}


def api_exception_handler(exc, context):
    """Render every handled DRF exception in the envelope.

    Without this, a serializer ValidationError returns a bare field map and the
    client has two response shapes to deal with instead of one.
    """
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    errors = _as_errors(response.data)
    message = errors.get('detail', ['Request failed.'])[0] if 'detail' in errors else 'Validation failed.'

    response.data = {
        'success': False,
        'message': message,
        'data': {},
        'errors': errors,
    }
    return response
