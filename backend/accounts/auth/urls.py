from django.urls import path

from accounts.auth.views_common import ChangePasswordView, LoginView, LogoutView, MeView, RefreshView
from accounts.auth.views_customer import CustomerRegisterView

urlpatterns = [
    path("register/customer/", CustomerRegisterView.as_view(), name="auth-register-customer"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]
