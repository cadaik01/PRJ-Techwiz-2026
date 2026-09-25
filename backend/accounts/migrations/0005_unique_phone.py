from collections import Counter

from django.db import migrations, models

from accounts.phone import normalize_phone


def normalize_existing_phones(apps, schema_editor):
    for model_name in ("CustomerProfile", "FarmerProfile"):
        model = apps.get_model("accounts", model_name)
        rows = list(model.objects.only("pk", "phone"))
        for row in rows:
            row.phone = normalize_phone(row.phone)
        duplicates = [p for p, n in Counter(r.phone for r in rows).items() if n > 1]
        if duplicates:
            raise RuntimeError(
                f"{model_name} has duplicate phone numbers after normalization: {duplicates}. "
                "Fix them before applying this migration."
            )
        model.objects.bulk_update(rows, ["phone"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_remove_customuser_must_change_password"),
    ]

    operations = [
        migrations.RunPython(normalize_existing_phones, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="customerprofile",
            name="phone",
            field=models.CharField(max_length=15, unique=True),
        ),
        migrations.AlterField(
            model_name="farmerprofile",
            name="phone",
            field=models.CharField(max_length=15, unique=True),
        ),
        migrations.AlterField(
            model_name="historicalfarmerprofile",
            name="phone",
            field=models.CharField(db_index=True, max_length=15),
        ),
    ]
