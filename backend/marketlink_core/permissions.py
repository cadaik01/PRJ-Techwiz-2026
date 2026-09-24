"""
Module: marketlink_core.permissions
Description: View-level permission checks by role only.

Object-level access (ownership, assignment, FSM state) belongs to [app]/policies.py
together with the queryset scoping in get_queryset(); a role check alone leaves the
API open to BOLA/IDOR.
"""

from rest_framework.permissions import BasePermission

from marketlink_core.policies.roles import RoleCode


class HasRole(BasePermission):
    """Allow users whose role code is in `role_codes`. Subclass once per actor."""

    role_codes: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.role.code in self.role_codes


class IsAdmin(HasRole):
    role_codes = (RoleCode.ADMIN,)
