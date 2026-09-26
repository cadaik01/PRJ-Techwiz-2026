from django.db import migrations


def _is_valid(days) -> bool:
    return (
        isinstance(days, list)
        and bool(days)
        and len(set(days)) == len(days)
        and all(isinstance(day, int) and not isinstance(day, bool) and 1 <= day <= 7 for day in days)
    )


def backfill_operating_days(apps, schema_editor):
    """D-031: fill farmer_profiles.operating_days for rows created before the column existed.

    Valid values are only sorted. Empty or invalid values take the weekdays of the farmer's
    active pickup slots (real data, no guessing). Farmers without any active slot keep []:
    they cannot receive orders anyway and must declare at least 1 day when editing the profile.
    Writes use update() so FarmerProfile.save() validation is not triggered here.
    """
    FarmerProfile = apps.get_model("accounts", "FarmerProfile")
    PickupSlot = apps.get_model("markets", "PickupSlot")

    left_empty = 0
    for farmer_id, days in FarmerProfile.objects.values_list("pk", "operating_days"):
        if _is_valid(days):
            new_days = sorted(days)
        else:
            new_days = sorted(
                set(
                    PickupSlot.objects.filter(
                        farmer_market__farmer_id=farmer_id, is_active=True
                    ).values_list("day_of_week", flat=True)
                )
            )
            if not new_days:
                left_empty += 1
        if new_days != days:
            FarmerProfile.objects.filter(pk=farmer_id).update(operating_days=new_days)

    if left_empty:
        print(f"\n  operating_days left empty for {left_empty} farmer(s) with no active pickup slot.")


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_farmerprofile_operating_days_and_more"),
        ("markets", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(backfill_operating_days, migrations.RunPython.noop),
    ]
