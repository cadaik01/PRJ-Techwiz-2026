from contextvars import ContextVar, Token

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(value: str | None) -> Token:
    """Bind the id for the current request; pass the returned token to reset_request_id()."""
    return _request_id.set(value)


def reset_request_id(token: Token) -> None:
    _request_id.reset(token)
