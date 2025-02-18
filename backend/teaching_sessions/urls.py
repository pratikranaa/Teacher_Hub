# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeachingSessionViewSet

router = DefaultRouter()
router.register(r'sessions', TeachingSessionViewSet, basename='teaching-session')

urlpatterns = [
    path('', include(router.urls)),
]