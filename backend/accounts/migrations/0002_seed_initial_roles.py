from django.db import migrations


def create_initial_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    roles_data = [
        {"code": "ADMIN", "name": "Administrator", "is_active": True},
        {"code": "FARMER", "name": "Farmer", "is_active": True},
        {"code": "CUSTOMER", "name": "Customer", "is_active": True},
    ]
    for r in roles_data:
        Role.objects.update_or_create(code=r["code"], defaults=r)


def remove_initial_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(code__in=["ADMIN", "FARMER", "CUSTOMER"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_initial_roles, reverse_code=remove_initial_roles),
    ]
