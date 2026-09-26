from django.urls import path

from accounts.auth.views_auth import FarmerRegisterView

# P2 adds AU-01, AU-03 -> AU-07 here. AU-08 (ws-ticket) stays in marketlink_core/urls.py.
urlpatterns = [
    path("register/farmer/", FarmerRegisterView.as_view(), name="auth-register-farmer"),
]
