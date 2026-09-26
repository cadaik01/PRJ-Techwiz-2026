from django.urls import path

from accounts.farmer.views_farmer import FarmerProfileView

urlpatterns = [
    path("", FarmerProfileView.as_view(), name="farmer-profile"),
]
