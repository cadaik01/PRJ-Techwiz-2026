"""
Module: accounts.admin
Description: Django admin for roles and user accounts.

CustomUserAdmin extends ModelAdmin, not UserAdmin: UserAdmin hard-codes username,
first_name and last_name, which this user model removes (admin.E108 / E116).
"""

from django.contrib import admin

from accounts.models import CustomUser, Profile, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active')
    search_fields = ('code', 'name')


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_active', 'is_staff', 'must_change_password', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff')
    list_select_related = ('role',)
    search_fields = ('email',)
    ordering = ('email',)
    inlines = (ProfileInline,)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Phân quyền & Vai trò', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'must_change_password')}),
        ('Thời gian', {'fields': ('created_at', 'updated_at')}),
    )
    # A plain ModelAdmin would save whatever is typed here as the raw password
    # column. Passwords are set through createsuperuser, changepassword or the API.
    readonly_fields = ('password', 'created_at', 'updated_at')
