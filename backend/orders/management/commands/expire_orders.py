from django.core.management.base import BaseCommand

from marketlink_core.services.db_retry import run_with_deadlock_retry
from orders.services.expiry_service import expire_overdue_orders


class Command(BaseCommand):
    help = "Expire PLACED orders whose pickup window has already started (A-005)."

    def handle(self, *args, **options):
        count = run_with_deadlock_retry(expire_overdue_orders)
        self.stdout.write(f"Expired {count} order(s)")
