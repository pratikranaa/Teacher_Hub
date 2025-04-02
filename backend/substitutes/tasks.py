from celery import shared_task
from django.db.models import Q, F, Value, IntegerField, Case, When
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import SubstituteRequest, RequestInvitation, TeacherAvailability
from accounts.models import TeacherProfile

BATCH_SIZE = 10  # Number of teachers per batch
WAIT_TIME = 10 * 60  # 10 minutes in seconds

@shared_task
def match_teachers_to_request(request_id):
    """Initial matching of teachers to a substitute request"""
    print(f"Starting teacher matching for request: {request_id}")
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        settings = request.school.get_algorithm_settings
        print(f"School settings: {settings}")
        
        # First notify school staff
        notify_school_staff(request)
        
        # Get first batch of ranked teachers using school settings
        ranked_teachers = get_ranked_teachers(request, settings)
        print(f"Found {ranked_teachers.count()} matching teachers")
        
        if not ranked_teachers:
            print(f"No matching teachers found for request {request_id}!")
            # Log the criteria being used
            print(f"Request criteria: Date={request.date}, Time={request.start_time}-{request.end_time}, Subject={request.subject}")
            return
            
        teachers_to_process = ranked_teachers[:settings['batch_size']]
        print(f"Processing batch of {len(teachers_to_process)} teachers")
        
        process_teacher_batch(request, teachers_to_process, batch_number=1)
        
        # Update request status
        request.status = 'AWAITING_ACCEPTANCE'
        request.save()
        print(f"Updated request {request_id} status to AWAITING_ACCEPTANCE")
        
        # Schedule next batch check
        check_request_status.apply_async(
            args=[request_id, 1],
            countdown=settings['wait_time_minutes'] * 60
        )
        print(f"Scheduled follow-up check in {settings['wait_time_minutes']} minutes")
    except SubstituteRequest.DoesNotExist:
        print(f"Request {request_id} not found!")
        return
    except Exception as e:
        print(f"Error in match_teachers_to_request: {str(e)}")
        import traceback
        traceback.print_exc()

# In substitutes/tasks.py
def get_ranked_teachers(request, settings):
    """Get ranked list of available teachers based on school criteria"""
    print(f"Searching for teachers with criteria:")
    print(f"  - Date: {request.date}")
    print(f"  - Time: {request.start_time} to {request.end_time}")
    print(f"  - Subject: {request.subject}")
    
    # First check how many teachers have any availability on this date
    all_teachers_available = TeacherAvailability.objects.filter(
        date=request.date
    ).count()
    print(f"Teachers with any availability on this date: {all_teachers_available}")
    
    # Then check how many have availability for the time slot
    time_slot_available = TeacherAvailability.objects.filter(
        date=request.date,
        start_time__lte=request.start_time,
        end_time__gte=request.end_time
    ).count()
    print(f"Teachers available during time slot: {time_slot_available}")
    
    # Check how many teachers have the required subject
    subject_teachers = TeacherProfile.objects.filter(
        subjects__icontains=request.subject
    ).count()
    print(f"Teachers with subject {request.subject}: {subject_teachers}")
    
    # Now do the actual query
    weights = settings['weights']
    
    results = TeacherAvailability.objects.filter(
        Q(date=request.date) &
        Q(start_time__lte=request.start_time) &
        Q(end_time__gte=request.end_time) &
        Q(status='AVAILABLE') &
        Q(teacher__teacher_profile__subjects__icontains=request.subject)
    ).exclude(
        teacher=request.requested_by
    ).annotate(
        # Your existing annotations
    ).order_by('-total_score')
    
    print(f"Final number of matching teachers: {results.count()}")
    return results

# In substitutes/tasks.py
def process_teacher_batch(request, teachers, batch_number):
    """Process a batch of teachers for invitations"""
    print(f"Processing batch {batch_number} for request {request.id} with {len(teachers)} teachers")
    for teacher in teachers:
        try:
            # Create invitation
            invitation = RequestInvitation.objects.create(
                substitute_request=request,
                teacher=teacher.teacher,
                status='PENDING',
                batch_number=batch_number
            )
            print(f"Created invitation ID {invitation.id} for teacher {teacher.teacher.email}")
            
            # Send notifications
            print(f"Sending WebSocket notification to teacher {teacher.teacher.id}")
            notify_teacher(invitation)
            
            print(f"Queueing email notification for teacher {teacher.teacher.email}")
            send_teacher_email.delay(invitation.id)
        except Exception as e:
            print(f"Error processing teacher {teacher.teacher.email}: {str(e)}")

@shared_task
def check_request_status(request_id, current_batch):
    """Check request status and escalate to next batch if needed"""
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        
        if request.status == 'AWAITING_ACCEPTANCE':
            # Get already invited teachers
            excluded_teachers = RequestInvitation.objects.filter(
                substitute_request=request
            ).values_list('teacher_id', flat=True)
            
            # Get next batch of teachers
            next_batch = get_ranked_teachers(request).exclude(
                teacher__in=excluded_teachers
            )[:BATCH_SIZE]
            
            if next_batch.exists():
                process_teacher_batch(request, next_batch, current_batch + 1)
                
                # Schedule next check
                check_request_status.apply_async(
                    args=[request_id, current_batch + 1],
                    countdown=WAIT_TIME
                )
            else:
                request.status = 'NO_TEACHERS_AVAILABLE'
                request.save()
                notify_school_staff_no_teachers(request)

    except SubstituteRequest.DoesNotExist:
        return

def notify_school_staff(request):
    """Send notification to school admin and principal"""
    channel_layer = get_channel_layer()
    content = {
        "type": "substitute.request",
        "content": {
            "request_id": str(request.id),
            "subject": request.subject,
            "grade": request.grade,
            "date": str(request.date),
            "time": f"{request.start_time} - {request.end_time}",
            "status": request.status
        }
    }
    
    # Notify admin and principal
    for role in ['admin', 'principal']:
        async_to_sync(channel_layer.group_send)(
            f"school_{request.school.id}_{role}",
            content
        )

# In substitutes/tasks.py
@shared_task
def send_teacher_email(invitation_id):
    """Send email notification to invited teacher"""
    print(f"Starting email notification task for invitation: {invitation_id}")
    try:
        invitation = RequestInvitation.objects.get(id=invitation_id)
        request = invitation.substitute_request
        teacher = invitation.teacher
        
        subject = f"Substitute Teaching Request - {request.subject}"
        accept_url = f"{settings.FRONTEND_URL}/accept-request/{invitation.id}"
        decline_url = f"{settings.FRONTEND_URL}/decline-request/{invitation.id}"
        
        message = f"""
        Dear {teacher.get_full_name()},
        
        You have been invited for a substitute teaching request.
        
        Details:
        School: {request.school.name}
        Subject: {request.subject}
        Grade: {request.grade}
        Date: {request.date}
        Time: {request.start_time} - {request.end_time}
        
        To respond to this request:
        Accept: {accept_url}
        Decline: {decline_url}
        
        Please respond within 10 minutes.
        
        Best regards,
        {request.school.name}
        """
        
        print(f"Sending email to: {teacher.email}")
        print(f"Email subject: {subject}")
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [teacher.email],
            fail_silently=False
        )
        print(f"Email sent to {teacher.email}")
    except RequestInvitation.DoesNotExist:
        print(f"Invitation {invitation_id} not found!")
        return
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        import traceback
        traceback.print_exc()

# In substitutes/tasks.py
def notify_teacher(invitation):
    """Send WebSocket notification to invited teacher"""
    try:
        channel_layer = get_channel_layer()
        request = invitation.substitute_request
        
        group_name = f"user_{invitation.teacher.id}"
        print(f"Sending WebSocket message to group: {group_name}")
        
        message = {
            "type": "substitute.invitation",
            "content": {
                "invitation_id": str(invitation.id),
                "request_id": str(request.id),
                "school": request.school.name,
                "subject": request.subject,
                "grade": request.grade,
                "date": str(request.date),
                "time": f"{request.start_time} - {request.end_time}",
                "expires_in": "10 minutes"
            }
        }
        print(f"WebSocket payload: {message}")
        
        async_to_sync(channel_layer.group_send)(group_name, message)
        print(f"WebSocket message sent to {group_name}")
    except Exception as e:
        print(f"Error sending WebSocket notification: {str(e)}")
        import traceback
        traceback.print_exc()

@shared_task
def send_assignment_notification(request_id):
    """Send notifications when a request is accepted"""
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        
        # Prepare notification content
        content = {
            "type": "substitute.assigned",
            "content": {
                "request_id": str(request.id),
                "subject": request.subject,
                "grade": request.grade,
                "date": str(request.date),
                "time": f"{request.start_time} - {request.end_time}",
                "teacher": request.assigned_teacher.get_full_name()
            }
        }
        
        channel_layer = get_channel_layer()
        
        # Notify all relevant parties
        notifications = [
            (f"user_{request.assigned_teacher.id}", "You have been assigned"),
            (f"user_{request.original_teacher.id}", "A substitute has been assigned"),
            (f"school_{request.school.id}_admin", "Substitute has been assigned"),
            (f"school_{request.school.id}_principal", "Substitute has been assigned")
        ]
        
        for group, message in notifications:
            content["content"]["message"] = message
            async_to_sync(channel_layer.group_send)(group, content)
            
        # Send confirmation email to assigned teacher
        send_confirmation_email.delay(request_id)
        
    except SubstituteRequest.DoesNotExist:
        return

@shared_task
def send_confirmation_email(request_id):
    """Send confirmation email to assigned teacher"""
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        teacher = request.assigned_teacher
        
        subject = f"Confirmation: Substitute Teaching Assignment - {request.subject}"
        message = f"""
        Dear {teacher.get_full_name()},
        
        Your substitute teaching assignment has been confirmed.
        
        Details:
        School: {request.school.name}
        Subject: {request.subject}
        Grade: {request.grade}
        Date: {request.date}
        Time: {request.start_time} - {request.end_time}
        
        Additional Information:
        Meeting Link: {request.meeting_link if request.mode == 'ONLINE' else 'N/A'}
        Special Instructions: {request.special_instructions}
        
        Best regards,
        {request.school.name}
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [teacher.email],
            fail_silently=False
        )
    except SubstituteRequest.DoesNotExist:
        return
