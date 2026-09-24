from django.dispatch import receiver
from simple_history.signals import pre_create_historical_record

from marketlink_core.context import get_request_id


@receiver(pre_create_historical_record)
def attach_history_request_id(sender, **kwargs):
    history_instance = kwargs.get("history_instance")
    if history_instance is not None:
        history_instance.request_id = get_request_id()
