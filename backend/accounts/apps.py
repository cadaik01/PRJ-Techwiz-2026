from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        from accounts import checks  # noqa: F401  (registers the system check)
        from accounts.auth import schema  # noqa: F401  (registers the OpenAPI auth scheme)
