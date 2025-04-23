"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django
django.setup()

from django.core.management import call_command
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from substitutes.token_auth import TokenAuthMiddleware
from decouple import config
from substitutes import routing as substitutes_routing
from accounts import routing as accounts_routing

websocket_urlpatterns = (
    substitutes_routing.websocket_urlpatterns + 
    accounts_routing.websocket_urlpatterns
)

print("websocket_urlpatterns: ", websocket_urlpatterns)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
