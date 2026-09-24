import ipaddress
import uuid

from marketlink_core.exceptions import BusinessValidationError, ErrorCode, PreconditionRequiredError


def normalize_request_id(raw: str | None) -> str | None:
    """Return a canonical UUID string, or None when the value is not a UUID.

    Stored request_id columns are CHAR(36), so anything else must be rejected here.
    """
    if not raw:
        return None
    try:
        return str(uuid.UUID(raw.strip()))
    except (ValueError, AttributeError):
        return None


def client_ip(request) -> str | None:
    """Best-effort client IP; invalid values are dropped because the column only fits an IP."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    candidates = [forwarded.split(",")[0].strip()] if forwarded else []
    candidates.append(request.META.get("REMOTE_ADDR") or "")
    for candidate in candidates:
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            continue
    return None


def parse_if_match(request) -> int:
    """Read the OCC version from If-Match; accepts "3", 3 and W/"3"."""
    raw = request.headers.get("If-Match")
    if raw is None or not raw.strip():
        raise PreconditionRequiredError(
            "The If-Match header is required.", code=ErrorCode.PRECONDITION_REQUIRED
        )
    cleaned = raw.strip().removeprefix("W/").strip().strip('"').strip("'")
    try:
        version = int(cleaned)
    except ValueError:
        version = 0
    if version < 1:
        raise BusinessValidationError(
            "Invalid If-Match value.",
            code=ErrorCode.VALIDATION_ERROR,
            errors={"if_match": ["Invalid If-Match value."]},
        )
    return version
