from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from channels.auth import get_user
from django.contrib.auth.models import AnonymousUser
import json
from channels.db import database_sync_to_async

class NotificationConsumer(JsonWebsocketConsumer):
    def connect(self):
        """Called when WebSocket connects"""
        # Get user from token
        self.user = self.scope["user"]
        
        if self.user is None or isinstance(self.user, AnonymousUser):
            print("Rejecting WebSocket - unauthenticated user")
            self.close()
            return
        
        print(f"User {self.user.id} connected to notifications websocket")
            
        # Add user to their personal notification group
        self.group_name = f"user_{self.user.id}"
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )

        # Add to role-specific groups if applicable
        if hasattr(self.user, 'school_staff'):
            school_id = str(self.user.school_staff.school.id)
            role = self.user.school_staff.role.lower()
            school_group = f"school_{school_id}_{role}"
            
            async_to_sync(self.channel_layer.group_add)(
                school_group,
                self.channel_name
            )
            print(f"Added to school group: {school_group}")
        
        self.accept()
        print(f"WebSocket connection accepted for {self.user.email}")
    
    def disconnect(self, close_code):
        """Called when WebSocket disconnects"""
        if hasattr(self, 'group_name'):
            async_to_sync(self.channel_layer.group_discard)(
                self.group_name,
                self.channel_name
            )
            
        # Remove from school group if applicable
        if hasattr(self, 'user') and hasattr(self.user, 'school_staff'):
            school_id = str(self.user.school_staff.school.id)
            role = self.user.school_staff.role.lower()
            school_group = f"school_{school_id}_{role}"
            
            async_to_sync(self.channel_layer.group_discard)(
                school_group,
                self.channel_name
            )
    
    # Generic handler for various notification types
    def notification(self, event):
        """Handle generic notification messages"""
        self.send_json(event)
    
    # Specific handlers for different notification types
    def substitute_invitation(self, event):
        """Forward substitute invitation notifications to the client"""
        self.send_json(event)
    
    def substitute_request(self, event):
        """Forward substitute request notifications to the client"""
        self.send_json(event)
        
    def substitute_assigned(self, event):
        """Forward substitute assigned notifications to the client"""
        self.send_json(event)
    
    def request_status_change(self, event):
        """Forward request status change notifications to the client"""
        self.send_json(event)