"""
Module: core.policies.base
Description: Abstract policy every entity policy ([app]/policies.py) implements.
"""

from abc import ABC, abstractmethod
from typing import Any


class BasePolicy(ABC):
    """Authorization as f(Actor, Action, Resource, Ownership, FSM State)."""

    @abstractmethod
    def can_view(self, actor: Any, resource: Any) -> bool:
        ...

    @abstractmethod
    def can_update(self, actor: Any, resource: Any) -> bool:
        ...

    @abstractmethod
    def can_delete(self, actor: Any, resource: Any) -> bool:
        ...

    @abstractmethod
    def can_transition(self, actor: Any, resource: Any, to_status: str) -> bool:
        ...
