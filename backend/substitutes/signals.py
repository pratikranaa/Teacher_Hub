from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import SubstituteRequest, RequestInvitation, Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

@receiver(post_save, sender=SubstituteRequest)
def handle_substitute_request_update(sender, instance, created, **kwargs):
    """Handle notifications for substitute request creation and updates"""
    channel_layer = get_channel_layer()
    
    # Prepare notification data
    content = {
        "type": "substitute.request",
        "content": {
            "request_id": str(instance.id),
            "subject": instance.subject,
            "grade": instance.grade,
            "date": str(instance.date),
            "time": f"{instance.start_time} - {instance.end_time}",
            "status": instance.status,
            "priority": instance.priority,
            "created_at": timezone.now().isoformat()
        }
    }
    
    if created:
        # New request notification for school staff
        # Send to school admin and principal groups
        for role in ['admin', 'principal']:
            async_to_sync(channel_layer.group_send)(
                f"school_{instance.school.id}_{role}", 
                content
            )
        
        # Create database notification for school admin and principals
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        school_staff = User.objects.filter(
            school_staff__school=instance.school,
            school_staff__role__in=['ADMIN', 'PRINCIPAL']
        )
        
        for staff in school_staff:
            Notification.objects.create(
                user=staff,
                content=f"New substitute request for {instance.subject} on {instance.date}",
                notification_type='REQUEST'
            )
    else:
        # Status change notification
        if 'status' in kwargs.get('update_fields', []) or kwargs.get('update_fields') is None:
            # 1. Notify original teacher about status changes
            if instance.requested_by:
                status_content = content.copy()
                status_content["type"] = "request.status_change"
                
                async_to_sync(channel_layer.group_send)(
                    f"user_{instance.requested_by.id}", 
                    status_content
                )
                
                # Create database notification
                Notification.objects.create(
                    user=instance.requested_by,
                    content=f"Request status changed to {instance.status} for {instance.subject} on {instance.date}",
                    notification_type='STATUS_UPDATE'
                )
            
            # 2. Notify school staff about status changes
            for role in ['admin', 'principal']:
                async_to_sync(channel_layer.group_send)(
                    f"school_{instance.school.id}_{role}", 
                    content
                )

@receiver(post_save, sender=RequestInvitation)
def handle_request_invitation(sender, instance, created, **kwargs):
    """Handle notifications for request invitations"""
    if created:
        # Create notification for invited teacher
        Notification.objects.create(
            user=instance.teacher,
            content=f"You have been invited to teach {instance.substitute_request.subject} at {instance.substitute_request.school.name}",
            notification_type='INVITATION'
        )
        
        # Send WebSocket notification
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.teacher.id}"
        notification_content = {
            "type": "substitute.invitation",
            "content": {
                "invitation_id": str(instance.id),
                "request_id": str(instance.substitute_request.id),
                "school": instance.substitute_request.school.name,
                "subject": instance.substitute_request.subject,
                "grade": instance.substitute_request.grade,
                "date": str(instance.substitute_request.date),
                "time": f"{instance.substitute_request.start_time} - {instance.substitute_request.end_time}",
                "priority": instance.substitute_request.priority,
                "created_at": timezone.now().isoformat(),
                "expires_at": instance.expires_at.isoformat() if instance.expires_at else None
            }
        }
        async_to_sync(channel_layer.group_send)(group_name, notification_content)
    elif instance.status in ['ACCEPTED', 'DECLINED', 'WITHDRAWN'] and 'status' in kwargs.get('update_fields', []):
        # Status changed - notify original teacher and school staff
        request = instance.substitute_request
        
        if instance.status == 'ACCEPTED':
            # Already handled in accept_request view, nothing to do here
            pass
        elif instance.status == 'DECLINED':
            # Notify school staff that a teacher declined
            channel_layer = get_channel_layer()
            content = {
                "type": "invitation.declined",
                "content": {
                    "request_id": str(request.id),
                    "teacher_id": str(instance.teacher.id),
                    "teacher_name": instance.teacher.get_full_name(),
                    "subject": request.subject,
                    "date": str(request.date),
                    "reason": instance.response_note,
                    "created_at": timezone.now().isoformat()
                }
            }
            
            # Notify school admin and principal
            for role in ['admin', 'principal']:
                async_to_sync(channel_layer.group_send)(
                    f"school_{request.school.id}_{role}", 
                    content
                )
                
            # Create database notification for school admin and principals
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            school_staff = User.objects.filter(
                school_staff__school=request.school,
                school_staff__role__in=['ADMIN', 'PRINCIPAL']
            )
            
            for staff in school_staff:
                Notification.objects.create(
                    user=staff,
                    content=f"{instance.teacher.get_full_name()} declined invitation for {request.subject} on {request.date}",
                    notification_type='DECLINED'
                )
        elif instance.status == 'WITHDRAWN':
            # Create notification for teacher that invitation was withdrawn
            if not request.assigned_teacher:  # Only if not already assigned to someone else
                Notification.objects.create(
                    user=instance.teacher,
                    content=f"Invitation withdrawn for {request.subject} at {request.school.name}",
                    notification_type='WITHDRAWN'
                )

@receiver(post_save, sender=Notification)
def send_notification(sender, instance, created, **kwargs):
    """Send WebSocket notification when a database notification is created"""
    if created:
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.user.id}"
        notification_content = {
            'type': 'notification',
            'content': {
                'id': str(instance.id),
                'message': instance.content,
                'timestamp': instance.timestamp.isoformat(),
                'notification_type': instance.notification_type,
                'read': False,
                'created_at': timezone.now().isoformat()
            }
        }
        async_to_sync(channel_layer.group_send)(group_name, notification_content)