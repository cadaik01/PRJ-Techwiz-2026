"""
Module: accounts.models
Description: Custom user model. Authentication is by email; the role field is left
             open until the SRS defines the actual actors.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from simple_history.models import HistoricalRecords


class CustomUserManager(BaseUserManager):
    """Create users by email address rather than username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """Account that signs in with an email address."""

    username = None
    email = models.EmailField(unique=True)

    # Once the SRS names the actors, turn this into a TextChoices field and mirror
    # the same values in frontend/src/config/constants.js.
    role = models.CharField(max_length=32, blank=True, default='')

    must_change_password = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()
    history = HistoricalRecords()

    class Meta:
        ordering = ('email',)

    def __str__(self):
        return self.email
