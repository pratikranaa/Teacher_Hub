from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync

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

    def school_profile_updated(self, event):
        """Handle school.profile.updated messages"""
        # Send message to WebSocket
        self.send_json(event)