from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="product",
            name="prod_price_min_1000",
        ),
        migrations.AlterField(
            model_name="product",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(
                condition=models.Q(("price__gte", Decimal("0.01")), ("price__lte", Decimal("10000.00"))),
                name="prod_price_range",
            ),
        ),
    ]
