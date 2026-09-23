"""
Module: core.context
Description: Per-request request_id held in a ContextVar, so models, signals and the
             audit trail can read it without a `request` object being passed down.
"""

from contextvars import ContextVar

_request_id: ContextVar[str | None] = ContextVar('request_id', default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(request_id: str | None):
    """Bind a request_id to the current context. Returns a token for reset_request_id()."""
    return _request_id.set(request_id)


def reset_request_id(token) -> None:
    _request_id.reset(token)
