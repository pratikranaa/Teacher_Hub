from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
import logging

# Set up logger
logger = logging.getLogger(__name__)

class SchoolNotificationConsumer(JsonWebsocketConsumer):
    def connect(self):
        """Called when WebSocket connects"""
        # Get user from scope
        user = self.scope["user"]
        
        if not user.is_authenticated:
            self.close()
            return
            
        # If user is school staff, add them to their role-specific group
        if hasattr(user, 'school_staff'):
            school_id = str(user.school_staff.school.id)
            role = user.school_staff.role.lower()
            group_name = f"school_{school_id}_{role}"
            
            async_to_sync(self.channel_layer.group_add)(
                group_name,
                self.channel_name
            )
            
            logger.info(f"Added to school group: {group_name}")
            print(f"Added to school group: {group_name}")
        
        # Log connection
        logger.info(f"WebSocket connection accepted for {user.email}")
        print(f"WebSocket connection accepted for {user.email}")
        
        self.accept()

    def disconnect(self, close_code):
        """Called when WebSocket disconnects"""
        # Remove from all groups
        if hasattr(self.scope["user"], 'school_staff'):
            school_id = str(self.scope["user"].school_staff.school.id)
            role = self.scope["user"].school_staff.role.lower()
            group_name = f"school_{school_id}_{role}"
            
            async_to_sync(self.channel_layer.group_discard)(
                group_name,
                self.channel_name
            )

    def receive_json(self, content):
        """Handle received messages from WebSocket"""
        logger.info(f"Received message: {content}")
        message_type = content.get('type')
        
        # Handle based on message type
        if message_type == 'school.profile.updated':
            self.school_profile_updated(content)
        else:
            logger.warning(f"Unknown message type: {message_type}")

    # Handler for both direct WebSocket messages and channel layer messages
    def school_profile_updated(self, event):
        """
        Handler for school.profile.updated messages
        Works for both direct WebSocket messages and messages from channel layer
        """
        logger.info(f"Received school.profile.updated message: {event}")
        # Forward the message to the WebSocket
        self.send_json({
            "type": "notification",
            "notification_type": "school_profile_updated",
            "data": event.get("content", {})
        })