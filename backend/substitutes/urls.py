from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubstituteRequestViewSet,
    get_notifications,
    mark_notification_read,
    clear_notifications,
    get_form_options
)

router = DefaultRouter()
router.register(r'substitute-requests', SubstituteRequestViewSet, basename='substitute-request')

urlpatterns = [
    path('', include(router.urls)),
    path('notifications/', get_notifications, name='get-notifications'),
    path('notifications/<str:pk>/read/', mark_notification_read, name='mark-notification-read'),
    path('notifications/clear/', clear_notifications, name='clear-notifications'),
    path('substitute-form-options/', get_form_options, name='get-form-options'),
]