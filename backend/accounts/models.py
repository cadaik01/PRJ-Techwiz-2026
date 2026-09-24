"""
Module: accounts.models
Description: IAM tables - roles, users, customer_profiles, farmer_profiles
             (MarketLink Pass 4A §3.1).
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import Q
from simple_history.models import HistoricalRecords

from core.models import BaseModel, HistoryRequestMeta
from core.policies.roles import RoleCode

CASE_AND_ACCENT_SENSITIVE = 'utf8mb4_0900_as_ci'


def normalize_email_address(email: str) -> str:
    return email.strip().lower()


class Role(BaseModel):
    """A new actor is a new row here, not a code change or a migration."""

    code = models.CharField(max_length=50, unique=True, db_collation=CASE_AND_ACCENT_SENSITIVE)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'roles'
        ordering = ('code',)

    def __str__(self):
        return self.code


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, role, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        if role is None:
            raise ValueError('A role is required.')
        if isinstance(role, str):
            role = Role.objects.get(code=role)
        user = self.model(email=normalize_email_address(email), role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, role=None, **extra_fields):
        """Profile rows are created by the registration services, not here."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, role, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        role, _ = Role.objects.get_or_create(
            code=RoleCode.ADMIN, defaults={'name': 'Quản trị viên'},
        )
        return self._create_user(email, password, role, **extra_fields)


class CustomUser(AbstractUser):
    """Signs in by email. date_joined is the registration date (no created_at column)."""

    username = None
    first_name = None
    last_name = None
    email = models.EmailField(max_length=100, unique=True)
    role = models.ForeignKey(Role, on_delete=models.RESTRICT, related_name='users')
    # True only for accounts an admin creates by hand.
    must_change_password = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'
        ordering = ('email',)
        indexes = [
            models.Index(fields=['role', 'is_active'], name='users_role_active_idx'),
        ]

    def __str__(self):
        return self.email


class CustomerProfile(BaseModel):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='customer_profile',
    )
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address = models.CharField(max_length=255)

    class Meta:
        db_table = 'customer_profiles'

    def __str__(self):
        return self.full_name


class FarmerStatus(models.TextChoices):
    PENDING = 'PENDING', 'Chờ duyệt'
    APPROVED = 'APPROVED', 'Đã duyệt'
    SUSPENDED = 'SUSPENDED', 'Đình chỉ'
    REJECTED = 'REJECTED', 'Từ chối'


class FarmerProfile(BaseModel):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='farmer_profile',
    )
    stall_name = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='farmers/', max_length=255, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=20, choices=FarmerStatus.choices, default=FarmerStatus.PENDING)
    status_reason = models.CharField(max_length=500, null=True, blank=True)
    order_cutoff_hours = models.PositiveSmallIntegerField(default=12)

    # Approval history shown to the admin (A-03).
    history = HistoricalRecords(table_name='farmer_profile_histories', bases=[HistoryRequestMeta])

    class Meta:
        db_table = 'farmer_profiles'
        indexes = [
            models.Index(fields=['status'], name='farmer_profiles_status_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(latitude__isnull=True, longitude__isnull=True)
                    | Q(latitude__isnull=False, longitude__isnull=False)
                ),
                name='farmer_profiles_coordinates_paired',
            ),
            models.CheckConstraint(
                condition=Q(order_cutoff_hours__lte=72),
                name='farmer_profiles_cutoff_hours_range',
            ),
        ]

    def __str__(self):
        return self.stall_name
