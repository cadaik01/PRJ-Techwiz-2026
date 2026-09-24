"""Seed the three MarketLink roles (§1.4 actors, Pass 4A §3 `roles`)."""

from django.db import migrations

ROLES = [
    ('ADMIN', 'Quản trị viên'),
    ('CUSTOMER', 'Khách hàng'),
    ('FARMER', 'Nông dân'),
]


def seed_roles(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    for code, name in ROLES:
        Role.objects.get_or_create(code=code, defaults={'name': name})


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_roles, migrations.RunPython.noop),
    ]
