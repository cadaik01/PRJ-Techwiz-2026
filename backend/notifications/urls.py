"""
Module: notifications.urls
Description: Routes for the notifications app, mounted at /api/notifications/.
"""

from django.urls import path

from notifications.views import NotificationListView, NotificationReadAllView, NotificationReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
    path('<int:id>/read/', NotificationReadView.as_view(), name='notification-read'),
]
