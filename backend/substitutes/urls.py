from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubstituteRequestViewSet, get_form_options
from django.urls import path

router = DefaultRouter()
router.register(r'substitute-requests', SubstituteRequestViewSet, basename='substitute-request')

urlpatterns = [
    path('', include(router.urls)),
    path('substitute-form-options/', get_form_options, name='form-options'),
]