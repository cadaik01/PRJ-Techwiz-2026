"""
Module: config.routing
Description: Root WebSocket URLconf. Collects the ws/ routes declared by each app.
"""

import notifications.routing

# Append each app's routing.websocket_urlpatterns here as the SRS requires them.
websocket_urlpatterns = [
    *notifications.routing.websocket_urlpatterns,
]
