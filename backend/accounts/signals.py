from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import School

@receiver(post_save, sender=School)
def notify_school_profile_update(sender, instance, **kwargs):
    """
    Signal handler that sends WebSocket notifications when school profile is updated
    """
    channel_layer = get_channel_layer()
    
    # Create notification payload
    content = {
        "type": "school.profile.updated",
        "content": {
            "school_id": str(instance.id),
            "school_name": instance.school_name,
            "message": "School profile has been updated"
        }
    }
    
    # Send to school admin and principal groups
    for role in ['admin', 'principal']:
        group_name = f"school_{instance.id}_{role}"
        async_to_sync(channel_layer.group_send)(group_name, content)