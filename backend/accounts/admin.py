from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from accounts.models import CustomerProfile, CustomUser, FarmerProfile, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "role",
        "is_active",
        "is_staff",
        "must_change_password",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email",)
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Permissions & Roles",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "must_change_password",
                )
            },
        ),
        ("Timestamps", {"fields": ("date_joined", "last_login", "updated_at")}),
    )
    readonly_fields = ("date_joined", "last_login", "updated_at")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "full_name", "phone", "created_at")
    search_fields = ("user__email", "full_name", "phone")


@admin.register(FarmerProfile)
class FarmerProfileAdmin(SimpleHistoryAdmin):
    list_display = (
        "user",
        "stall_name",
        "contact_person",
        "phone",
        "status",
        "order_cutoff_hours",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("user__email", "stall_name", "contact_person", "phone")
