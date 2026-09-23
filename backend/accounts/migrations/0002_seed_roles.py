"""Seed the roles table. Add the SRS actors (e.g. CUSTOMER) to ROLES once they are known."""

from django.db import migrations

ROLES = [
    ('ADMIN', 'Administrator'),
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
