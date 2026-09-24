from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_history_change_reason_text"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customuser",
            name="must_change_password",
        ),
    ]
