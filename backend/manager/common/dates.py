"""
Module: manager.common.dates
Description: `from` / `to` query parameters as Vietnamese calendar days (Pass 4B §2.3).

Days are turned into an aware half-open range [start of `from`, start of the day after
`to`) instead of filtering on `__date`, which needs MySQL's time zone tables loaded.
"""

from datetime import date, datetime, time, timedelta

from django.utils import timezone

from marketlink_core.exceptions import BusinessValidationError

DATE_MESSAGE = 'Invalid date (use YYYY-MM-DD)'


def _parse(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise BusinessValidationError('Invalid data', errors={field: [DATE_MESSAGE]}) from None


def _start_of(day: date) -> datetime:
    return timezone.make_aware(datetime.combine(day, time.min))


def day_range(
    params, *, required: bool = False, max_days: int | None = None,
) -> tuple[datetime | None, datetime | None]:
    """Read `from` and `to` from query params; either may be absent unless `required`."""
    errors = {}
    raw = {field: (params.get(field) or '').strip() for field in ('from', 'to')}
    if required:
        errors = {field: ['Please choose a date'] for field, value in raw.items() if not value}
    if errors:
        raise BusinessValidationError('Invalid data', errors=errors)

    start_day = _parse(raw['from'], 'from') if raw['from'] else None
    end_day = _parse(raw['to'], 'to') if raw['to'] else None
    if start_day and end_day:
        if end_day < start_day:
            raise BusinessValidationError(
                'Invalid data', errors={'to': ['The end date must be on or after the start date']},
            )
        if max_days and (end_day - start_day).days + 1 > max_days:
            raise BusinessValidationError(
                'Invalid data', errors={'to': [f'The range can span at most {max_days} days']},
            )
    return (
        _start_of(start_day) if start_day else None,
        _start_of(end_day + timedelta(days=1)) if end_day else None,
    )
