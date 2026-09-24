import re

_SEPARATORS = re.compile(r"[\s.\-()]")


# One canonical form (0xxxxxxxxx) so "+84 90 123 4567" and "090.123.4567" hit the same UNIQUE key (D-028).
def normalize_phone(raw: str | None) -> str:
    phone = _SEPARATORS.sub("", raw or "")
    if phone.startswith("+84"):
        phone = "0" + phone[3:]
    elif phone.startswith("84") and len(phone) == 11:
        phone = "0" + phone[2:]
    return phone
