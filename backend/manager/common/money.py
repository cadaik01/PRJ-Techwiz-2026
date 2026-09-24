"""
Module: manager.common.money
Description: Money leaves the API as a 2-decimal string (Pass 4B §2.4, D-020: USD),
             so a client never has to guess how a float was rounded.
"""

from decimal import Decimal


def money(amount: Decimal | int | None) -> str:
    """Format an aggregate as "12.50"; a missing sum reads as zero."""
    return f'{Decimal(amount or 0):.2f}'
