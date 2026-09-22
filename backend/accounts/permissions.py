"""
Module: accounts.permissions
Description: Reusable DRF permission classes.

Role-based checks answer "what kind of user is this"; they are not enough on their
own. Any endpoint addressing a single record by id must also run an object-level
check such as IsOwner, otherwise the API is open to IDOR/BOLA.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdmin(BasePermission):
    """Full administrative access."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsStaff(BasePermission):
    """Internal back-office user."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsOwner(BasePermission):
    """Object-level ownership check.

    Looks for the attribute named by the view's `owner_field` (default 'user') and
    compares it with the caller. Set `owner_field = 'created_by'` on the view when
    the model names it differently.
    """

    def has_object_permission(self, request, view, obj):
        owner_field = getattr(view, 'owner_field', 'user')
        owner = getattr(obj, owner_field, None)
        if owner is None and obj.__class__.__name__ == 'CustomUser':
            owner = obj
        return owner == request.user


class IsOwnerOrReadOnly(IsOwner):
    """Anyone authenticated may read; only the owner may write."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return super().has_object_permission(request, view, obj)
