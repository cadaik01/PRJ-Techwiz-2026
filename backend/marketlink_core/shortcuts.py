from django.core.exceptions import ObjectDoesNotExist

from marketlink_core.exceptions import ResourceNotFoundError


def get_or_404(queryset, *, message: str, **lookup):
    # Outside a DRF generic's get_object(), a bare .get() would surface as a 500; §6.1 wants
    # anything out of scope to look like a 404.
    try:
        return queryset.get(**lookup)
    except ObjectDoesNotExist:
        raise ResourceNotFoundError(message) from None
