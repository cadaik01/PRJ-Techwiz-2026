from rest_framework.permissions import BasePermission

from marketlink_core.policies.roles import RoleCode


class _RolePermission(BasePermission):
    role: str = ""
    message = "You do not have permission to access this resource."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        role = getattr(user, "role", None)
        return role is not None and role.code == self.role


class IsCustomer(_RolePermission):
    role = RoleCode.CUSTOMER


class IsFarmer(_RolePermission):
    role = RoleCode.FARMER


class IsAdmin(_RolePermission):
    role = RoleCode.ADMIN
