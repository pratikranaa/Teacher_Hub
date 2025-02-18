from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubstituteRequestViewSet

router = DefaultRouter()
router.register(r'substitute-requests', SubstituteRequestViewSet, basename='substitute-request')

urlpatterns = [
    path('', include(router.urls))
    
]


