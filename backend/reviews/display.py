def short_customer_name(full_name: str) -> str:
    """U-05: public reviews show "Nguyen V. A." for "Nguyen Van An" (family name, then initials).

    Shared by every screen that lists reviews (C-07, F-09, PU-12, A-08) so the name looks the same everywhere.
    """
    words = (full_name or "").split()
    if not words:
        return "Customer"
    first, rest = words[0], words[1:]
    return " ".join([first.capitalize(), *(f"{word[0].upper()}." for word in rest)])
