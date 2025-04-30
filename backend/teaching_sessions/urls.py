# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeachingSessionViewSet, SessionRecordingViewSet

router = DefaultRouter()
router.register(r'sessions', TeachingSessionViewSet, basename='teaching-session')
router.register(r'recordings', SessionRecordingViewSet, basename='session-recording')

urlpatterns = [
    path('', include(router.urls)),
]