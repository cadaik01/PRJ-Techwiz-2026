from rest_framework.permissions import BasePermission

from marketlink_core.policies.roles import RoleCode
from system.models import AuditAction
from system.services.audit_service import log_security_event


class RolePermission(BasePermission):
    role_code = ""

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role.code == self.role_code:
            return True
        # Pass 4B §6.1 / CT-04: wrong role branch is 403 plus an ACCESS_DENIED audit row.
        log_security_event(
            request, action=AuditAction.ACCESS_DENIED, status_code=403, details={"required_role": self.role_code}
        )
        return False


class IsCustomer(RolePermission):
    role_code = RoleCode.CUSTOMER
