"""
Module: accounts.models
Description: The three IAM tables - roles, users (sign-in by email) and profiles.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models, transaction

from core.models import BaseModel
from core.policies.roles import RoleCode


def normalize_email_address(email: str) -> str:
    return email.strip().lower()


class Role(BaseModel):
    """A new actor is a new row here, not a code change or a migration."""

    code = models.CharField(max_length=50, unique=True)
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

        with transaction.atomic():
            user = self.model(email=normalize_email_address(email), role=role, **extra_fields)
            user.set_password(password)
            user.save(using=self._db)
            Profile.objects.create(user=user)
        return user

    def create_user(self, email, password=None, role=None, **extra_fields):
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
            code=RoleCode.ADMIN, defaults={'name': 'Administrator'},
        )
        return self._create_user(email, password, role, **extra_fields)


class CustomUser(AbstractUser, BaseModel):
    """Signs in by email. Personal details live on Profile to keep this row small."""

    username = None
    first_name = None
    last_name = None
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.RESTRICT, related_name='users')
    # False by default so self-registered users are not forced to change it; set
    # True only for accounts an admin creates by hand.
    must_change_password = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'
        ordering = ('email',)

    def __str__(self):
        return self.email


class Profile(BaseModel):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='profile',
    )
    full_name = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    class Meta:
        db_table = 'profiles'

    def __str__(self):
        return self.full_name or self.user.email
