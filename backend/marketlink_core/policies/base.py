from abc import ABC, abstractmethod
from typing import Any


class BasePolicy(ABC):
    """
    Abstract base policy evaluating permissions across five dimensions:
    f(Actor, Action, Resource, Ownership, FSM State).
    """

    @abstractmethod
    def can_view(self, actor: Any, resource: Any) -> bool:
        """Evaluate read permission for a given resource."""
        raise NotImplementedError

    @abstractmethod
    def can_create(self, actor: Any) -> bool:
        """Evaluate creation permission for a given resource type."""
        raise NotImplementedError

    @abstractmethod
    def can_update(self, actor: Any, resource: Any) -> bool:
        """Evaluate update permission for a given resource."""
        raise NotImplementedError

    @abstractmethod
    def can_delete(self, actor: Any, resource: Any) -> bool:
        """Evaluate deletion or soft-delete permission for a given resource."""
        raise NotImplementedError

    @abstractmethod
    def can_transition(self, actor: Any, resource: Any, to_status: str) -> bool:
        """Evaluate FSM state transition authority (Gate 2 validation)."""
        raise NotImplementedError
