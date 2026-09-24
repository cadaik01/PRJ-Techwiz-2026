from django.db import models


class RoleCode(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    FARMER = "FARMER", "Farmer"
    CUSTOMER = "CUSTOMER", "Customer"
