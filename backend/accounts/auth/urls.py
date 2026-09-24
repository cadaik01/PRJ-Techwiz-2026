from django.urls import path

from accounts.auth.views_common import LoginView
from accounts.auth.views_customer import CustomerRegisterView

urlpatterns = [
    path("register/customer/", CustomerRegisterView.as_view(), name="auth-register-customer"),
    path("login/", LoginView.as_view(), name="auth-login"),
]
