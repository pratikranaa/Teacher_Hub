from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class SubstituteRequestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return
            
        # Join user-specific group
        await self.channel_layer.group_add(
            f"user_{user.id}",
            self.channel_name
        )
        
        # Join school-specific groups if applicable
        if hasattr(user, 'school_profile'):
            school_id = user.school_profile.id
            if user.user_type == 'SCHOOL_ADMIN':
                await self.channel_layer.group_add(
                    f"school_{school_id}_admin",
                    self.channel_name
                )
            elif user.user_type == 'PRINCIPAL':
                await self.channel_layer.group_add(
                    f"school_{school_id}_principal",
                    self.channel_name
                )
                
        await self.accept()

    async def disconnect(self, close_code):
        user = self.scope["user"]
        if user.is_authenticated:
            await self.channel_layer.group_discard(
                f"user_{user.id}",
                self.channel_name
            )

    async def substitute_request(self, event):
        """Handle substitute request notifications"""
        await self.send_json(event["content"])

    async def substitute_invitation(self, event):
        """Handle substitute invitation notifications"""
        await self.send_json(event["content"])

    async def substitute_assigned(self, event):
        """Handle substitute assignment notifications"""
        await self.send_json(event["content"])