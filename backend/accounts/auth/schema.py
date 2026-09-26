from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme


# Without this, drf-spectacular cannot resolve the JWTAuthentication subclass and drops the
# security scheme from every view that uses it.
class SessionJWTScheme(SimpleJWTScheme):
    target_class = "accounts.auth.authentication.SessionJWTAuthentication"
    name = "jwtAuth"
