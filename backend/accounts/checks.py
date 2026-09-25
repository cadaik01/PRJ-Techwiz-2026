from django.conf import settings
from django.core.checks import Error, Tags, register

PROCESS_LOCAL_BACKENDS = (
    "django.core.cache.backends.locmem.LocMemCache",
    "django.core.cache.backends.dummy.DummyCache",
)


@register(Tags.security)
def check_token_revocation_store(app_configs, **kwargs):
    """Logout, single-use refresh tokens and the password-change exemption live in the "blacklist" cache.
    A process-local cache silently breaks them as soon as more than one worker runs."""
    if settings.DEBUG:
        return []
    backend = settings.CACHES.get("blacklist", {}).get("BACKEND", "")
    if backend and backend not in PROCESS_LOCAL_BACKENDS:
        return []
    return [
        Error(
            "Token revocation needs a shared Redis cache for the 'blacklist' alias.",
            hint="Set USE_REDIS=True and REDIS_URL (Redis or Memurai) for any non-DEBUG deployment.",
            id="accounts.E001",
        )
    ]
