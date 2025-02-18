# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SubstituteRequest

@receiver(post_save, sender=SubstituteRequest)
def handle_substitute_request_update(sender, instance, created, **kwargs):
    if created:
        # Trigger matching algorithm
        from .tasks import match_teachers_to_request
        match_teachers_to_request.delay(instance.id)
    
    if instance.status == 'ASSIGNED':
        # Send notifications
        from .tasks import send_assignment_notifications
        send_assignment_notifications.delay(instance.id)
        
# signals.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification

@receiver(post_save, sender=Notification)
def send_notification(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.user.id}"
        notification_content = {
            'type': 'notification',
            'content': {
                'message': instance.content,
                'timestamp': instance.timestamp.isoformat(),
                'notification_type': instance.notification_type,
            }
        }
        async_to_sync(channel_layer.group_send)(group_name, notification_content)