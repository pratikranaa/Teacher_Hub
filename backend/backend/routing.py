from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from accounts import routing as accounts_routing
from substitutes import routing as substitutes_routing

application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            accounts_routing.websocket_urlpatterns,
            substitutes_routing.websocket_urlpatterns
        )
    ),
})