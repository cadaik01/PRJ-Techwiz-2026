from django.core.management.base import BaseCommand

from orders.services.expiry import expire_overdue_orders


class Command(BaseCommand):
    help = "Expire PLACED orders whose pickup time has started and return their stock (A-005)."

    def add_arguments(self, parser):
        parser.add_argument("--farmer-id", type=int, default=None, help="Only this farmer's orders.")

    def handle(self, *args, **options):
        count = expire_overdue_orders(farmer_id=options["farmer_id"])
        self.stdout.write(self.style.SUCCESS(f"Expired {count} order(s)."))
