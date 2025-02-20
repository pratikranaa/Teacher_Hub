"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from substitutes import routing as substitutes_routing
from accounts import routing as accounts_routing


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Combine websocket URL patterns from both apps
websocket_urlpatterns = (
    substitutes_routing.websocket_urlpatterns + 
    accounts_routing.websocket_urlpatterns
)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})