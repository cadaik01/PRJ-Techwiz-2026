from django.urls import path

# AU-02 customer registration lives on the customer branch; this one carries Admin and the
# shared session endpoints only.
from accounts.auth.views_common import AdminLoginView, ChangePasswordView, LoginView, LogoutView, MeView, RefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("admin/login/", AdminLoginView.as_view(), name="auth-admin-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]
