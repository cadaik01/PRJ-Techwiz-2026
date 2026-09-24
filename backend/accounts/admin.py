"""
Module: accounts.admin
Description: Django admin for roles, user accounts and profiles.

CustomUserAdmin extends ModelAdmin, not UserAdmin: UserAdmin hard-codes username,
first_name and last_name, which this user model removes (admin.E108 / E116).
"""

from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from accounts.models import CustomerProfile, CustomUser, FarmerProfile, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active')
    search_fields = ('code', 'name')


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_active', 'is_staff', 'must_change_password', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    list_select_related = ('role',)
    search_fields = ('email',)
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Phân quyền & Vai trò', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'must_change_password')}),
        ('Thời gian', {'fields': ('date_joined', 'last_login', 'updated_at')}),
    )
    # A plain ModelAdmin would save whatever is typed here as the raw password
    # column. Passwords are set through createsuperuser, changepassword or the API.
    readonly_fields = ('password', 'date_joined', 'last_login', 'updated_at')


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'phone')
    search_fields = ('user__email', 'full_name', 'phone')
    list_select_related = ('user',)


@admin.register(FarmerProfile)
class FarmerProfileAdmin(SimpleHistoryAdmin):
    list_display = ('user', 'stall_name', 'status', 'order_cutoff_hours')
    list_filter = ('status',)
    search_fields = ('user__email', 'stall_name', 'phone')
    list_select_related = ('user',)
