"""Shared `?ordering=` handling for the admin lists (v1.8).

Each list owns an allow-list mapping a short key the UI sends to the columns the database
sorts by. Sorting has to happen here rather than in the browser: the admin tables are paged
server-side, so a client-side sort would only reorder the ten rows already on screen and
quietly hide the row the admin was looking for.
"""

from typing import Any

from marketlink_core.exceptions import BusinessValidationError


def resolve_ordering(
    raw: str | None, *, allowed: dict[str, tuple[Any, ...]], default: str
) -> tuple[Any, ...]:
    """Return the order_by() arguments for `raw`, or raise 400 if it is not on the list.

    An unknown key is rejected rather than ignored: silently falling back to the default
    would show the admin a sorted-looking table that is not sorted the way they asked.
    """
    key = (raw or "").strip()
    if not key:
        return allowed[default]
    if key not in allowed:
        raise BusinessValidationError(
            "Unknown sort column.",
            errors={"ordering": [f"Choose one of: {', '.join(sorted(allowed))}."]},
        )
    return allowed[key]


def both_directions(
    columns: dict[str, tuple[str, ...]], *, tiebreak: tuple[str, ...] = ()
) -> dict[str, tuple[str, ...]]:
    """Expand {"name": ("stall_name",)} into both "name" and "-name".

    Plain column names only. A sort that needs an expression - putting NULL ratings last, say -
    spells both of its directions out by hand, because Django's OrderBy.asc()/.desc() mutate
    the expression in place and return None, so they cannot be used to flip one here.

    The descending form flips every column, so a multi-column sort reverses as a whole rather
    than only by its first column. The tiebreak keeps its direction: it exists to make the
    page boundaries stable, not to follow the sort.
    """
    expanded: dict[str, tuple[str, ...]] = {}
    for key, fields in columns.items():
        for field in fields:
            if not isinstance(field, str):
                raise TypeError(f"{key!r}: both_directions takes column names, not expressions.")
        expanded[key] = (*fields, *tiebreak)
        expanded[f"-{key}"] = (*(_flip(field) for field in fields), *tiebreak)
    return expanded


def _flip(field: str) -> str:
    return field[1:] if field.startswith("-") else f"-{field}"
