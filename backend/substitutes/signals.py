from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SubstituteRequest, RequestInvitation, Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

@receiver(post_save, sender=SubstituteRequest)
def handle_substitute_request_update(sender, instance, created, **kwargs):
    if created:
        print(f"Signal triggered for request: {instance.id}")
        # Trigger matching algorithm
        from .tasks import match_teachers_to_request
        print(f"Dispatching match_teachers_to_request task for request: {instance.id}")
        match_teachers_to_request.delay(instance.id)
        
        # Create notification for school admin
        Notification.objects.create(
            user=instance.school.admin,
            content=f"New substitute request created for {instance.subject}",
            notification_type='REQUEST_CREATED'
        )
    
    if instance.status == 'ASSIGNED':
        # Create notification for assigned teacher
        Notification.objects.create(
            user=instance.assigned_teacher,
            content=f"You have been assigned to teach {instance.subject} at {instance.school.name}",
            notification_type='ASSIGNMENT'
        )
        
        # Create notification for school admin
        Notification.objects.create(
            user=instance.school.admin,
            content=f"Teacher {instance.assigned_teacher.get_full_name()} has been assigned to {instance.subject}",
            notification_type='ASSIGNMENT'
        )
        
        # Send email notifications
        from .tasks import send_assignment_notifications
        send_assignment_notifications.delay(instance.id)
    
    elif instance.status == 'REJECTED':
        # Create notification for school admin
        Notification.objects.create(
            user=instance.school.admin,
            content=f"Request for {instance.subject} was rejected by {instance.assigned_teacher.get_full_name()}",
            notification_type='REQUEST_REJECTED'
        )

@receiver(post_save, sender=RequestInvitation)
def handle_request_invitation(sender, instance, created, **kwargs):
    if created:
        # Create notification for invited teacher
        Notification.objects.create(
            user=instance.teacher,
            content=f"You have been invited to teach {instance.substitute_request.subject} at {instance.substitute_request.school.name}",
            notification_type='INVITATION'
        )
        
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.teacher.id}"
        notification_content = {
            "type": "request_invitation",
            "content": {
                "request_id": instance.substitute_request.id,
                "school": instance.substitute_request.school.name,
                "subject": instance.substitute_request.subject,
                "date": str(instance.substitute_request.date),
                "time": f"{instance.substitute_request.start_time} - {instance.substitute_request.end_time}"
            }
        }
        async_to_sync(channel_layer.group_send)(group_name, notification_content)

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