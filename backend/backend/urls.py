"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt import views as jwt_views
from drf_yasg import openapi
from drf_yasg.views import get_schema_view as swagger_get_schema_view
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import UserLoginView


schema_view = swagger_get_schema_view(
    openapi.Info(
        title="Teacher Hub API",
        default_version='1.0.0',
        description="API documentation of App",
    ),
    public=True,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', schema_view.with_ui('swagger', cache_timeout=0), name="swagger-schema"),
    path('api/',include('accounts.urls')),
    path('api/', include('substitutes.urls')),
    path('api/teaching-sessions/', include('teaching_sessions.urls')),
    path('api/login/', UserLoginView.as_view(), name='token_obtain_pair'),
    path('api/login-refresh/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'),
    path('api/login-verify/', jwt_views.TokenVerifyView.as_view(), name='verify_token'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)