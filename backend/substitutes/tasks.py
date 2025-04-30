from celery import shared_task
from django.db.models import Q, F, Value, IntegerField, Case, When
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import SubstituteRequest, RequestInvitation, TeacherAvailability, Notification
from accounts.models import User, School, SchoolStaff
from accounts.models import TeacherProfile
from accounts.utils import send_email as send

# Import improved email utilities
import logging
import time
import random
import json
import subprocess
import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logger = logging.getLogger(__name__)

BATCH_SIZE = 10  # Number of teachers per batch
WAIT_TIME = 10 * 60  # 10 minutes in seconds

# Maximum retry attempts for email sending
MAX_EMAIL_RETRIES = 3

# Exponential backoff settings for retries
INITIAL_RETRY_DELAY = 2  # seconds
MAX_RETRY_DELAY = 30  # seconds

# Path to the standalone email script
EMAIL_SCRIPT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'send_email_cli.py')

# Helper function for exponential backoff
def get_retry_delay(attempt):
    """Calculate delay with exponential backoff and jitter"""
    delay = min(INITIAL_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
    jitter = random.uniform(0, 0.3 * delay)  # Add up to 30% jitter
    return delay + jitter

# Emergency direct email function that bypasses all abstractions
def send_emergency_email(to_email, subject, body, from_email=None):
    """
    Emergency direct email function that uses smtplib directly with no dependencies
    This is a last resort when all other approaches fail
    """
    print(f"🚨 EMERGENCY EMAIL SYSTEM: Sending to {to_email}")
    
    # Use environment variables directly
    email_host = settings.EMAIL_HOST
    email_port = settings.EMAIL_PORT
    email_user = settings.EMAIL_HOST_USER
    email_password = settings.EMAIL_HOST_PASSWORD
    email_use_tls = settings.EMAIL_USE_TLS
    
    if from_email is None:
        from_email = email_user
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    for attempt in range(3):  # Try 3 times
        try:
            print(f"Attempt {attempt+1}: Connecting to {email_host}:{email_port}...")
            server = smtplib.SMTP(email_host, email_port, timeout=30)
            
            if email_use_tls:
                print("Starting TLS...")
                server.starttls()
                
            print(f"Logging in as {email_user}...")
            server.login(email_user, email_password)
            
            print(f"Sending email to {to_email}...")
            server.send_message(msg)
            
            print("Closing connection...")
            server.quit()
            
            print(f"✅ Emergency email sent successfully to {to_email}!")
            return True
            
        except Exception as e:
            print(f"❌ Emergency email error (attempt {attempt+1}): {type(e).__name__}: {str(e)}")
            
            if attempt < 2:  # Only sleep if we're going to retry
                delay = 2 ** attempt
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
    
    print(f"❌ Failed to send emergency email to {to_email} after 3 attempts")
    return False

# New helper function to send emails using the standalone script
def send_email_via_script(to_email, subject, body, from_email=None):
    """
    Send an email using the standalone email script
    This completely bypasses Django's email system for more reliability
    """
    try:
        email_data = {
            "to": to_email,
            "subject": subject,
            "body": body,
            "retries": 3
        }
        
        if from_email:
            email_data["from"] = from_email
            
        # Convert data to JSON
        json_data = json.dumps(email_data)
        
        # Run the standalone script with the JSON data
        logger.info(f"Sending email to {to_email} via standalone script")
        result = subprocess.run(
            [sys.executable, EMAIL_SCRIPT_PATH, "--json", json_data],
            capture_output=True,
            text=True,
            check=False
        )
        
        # Log the result
        if result.returncode == 0:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email to {to_email}: {result.stderr}")
            return False
            
    except Exception as e:
        logger.exception(f"Error executing email script: {str(e)}")
        return False

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
from django.db.models import F, Q, Value, FloatField, ExpressionWrapper

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
        # Fix this line - use experience_years instead of years_experience
        experience_score=ExpressionWrapper(
            F('teacher__teacher_profile__experience_years') * Value(weights.get('experience', 1)),
            output_field=FloatField()
        ),
        rating_score=ExpressionWrapper(
            F('teacher__teacher_profile__rating') * Value(weights.get('rating', 1)), 
            output_field=FloatField()
        ),
        total_score=ExpressionWrapper(
            F('experience_score') + F('rating_score') + Value(1.0),
            output_field=FloatField()
        )
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
            
            # IMPORTANT CHANGE: Instead of queueing a task, send email directly
            # This bypasses the Celery task and connection pooling entirely
            try:
                # Get frontend URL from settings, with fallback
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                
                # Prepare email content
                subject = f"Substitute Teaching Request - {request.subject}"
                accept_url = f"{frontend_url}/accept-request/{invitation.id}"
                decline_url = f"{frontend_url}/decline-request/{invitation.id}"
                
                message = f"""
Dear {teacher.teacher.get_full_name()},

You have been invited for a substitute teaching request.

Details:
School: {request.school.school_name}
Subject: {request.subject}
Grade: {request.grade}
Date: {request.date}
Time: {request.start_time} - {request.end_time}

To respond to this request:
Accept: {accept_url}
Decline: {decline_url}

Please respond within 10 minutes.

Best regards,
{request.school.school_name} Team
"""
                
                from_email = f"{request.school.school_name} <{settings.EMAIL_HOST_USER}>"
                
                # Try sending directly using our emergency function
                success = send_emergency_email(
                    teacher.teacher.email,
                    subject,
                    message,
                    from_email
                )
                
                if success:
                    print(f"✅ Email sent directly to {teacher.teacher.email}")
                else:
                    # As a fallback, also queue the regular email task in case direct sending fails
                    send_teacher_email.delay(invitation.id)
            except Exception as email_error:
                print(f"Error sending direct email: {str(email_error)}")
                # Still queue the task as a backup
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
    """Send email notification to invited teacher using standalone script"""
    logger.info(f"Starting email notification task for invitation: {invitation_id}")
    
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
School: {request.school.school_name}
Subject: {request.subject}
Grade: {request.grade}
Date: {request.date}
Time: {request.start_time} - {request.end_time}

To respond to this request:
Accept: {accept_url}
Decline: {decline_url}

Please respond within 10 minutes.

Best regards,
{request.school.school_name} Team
"""
        
        logger.info(f"Sending email to: {teacher.email}")
        
        # Use standalone script instead of Django email
        from_email = f"{request.school.school_name} <pratikrana507@gmail.com>"
        success = send_email_via_script(
            teacher.email,
            subject,
            message,
            from_email
        )
        
        if success:
            logger.info(f"✅ Email successfully sent to {teacher.email}")
            return f"Email sent successfully to {teacher.email}"
        else:
            logger.error(f"❌ Failed to send email to {teacher.email}")
            return f"Failed to send email to {teacher.email}"
                
    except RequestInvitation.DoesNotExist:
        logger.error(f"Invitation {invitation_id} not found!")
        return f"Invitation {invitation_id} not found"
        
    except Exception as e:
        logger.error(f"Error preparing email: {str(e)}")
        return f"Error preparing email: {str(e)}"

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
                "school": {
                    "id": str(request.school.id),
                    "name": request.school.school_name  # Assuming `name` is a field on School
                },
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
def send_assignment_notifications(request_id):
    """Send notifications when a request is accepted"""
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        
        if not request.assigned_teacher:
            return "No assigned teacher found"
        
        # Prepare notification content
        content = {
            "type": "substitute.assigned",
            "content": {
                "request_id": str(request.id),
                "subject": request.subject,
                "grade": request.grade,
                "date": str(request.date),
                "time": f"{request.start_time} - {request.end_time}",
                "teacher": request.assigned_teacher.get_full_name(),
                "priority": request.priority,
                "created_at": timezone.now().isoformat()
            }
        }
        
        channel_layer = get_channel_layer()
        
        # Notify all relevant parties
        notifications = [
            # Assigned teacher notification
            (f"user_{request.assigned_teacher.id}", "You have been assigned"),
            
            # Original teacher notification (if different)
            (f"user_{request.requested_by.id}", "A substitute has been assigned"),
            
            # School staff notifications
            (f"school_{request.school.id}_admin", "Substitute has been assigned"),
            (f"school_{request.school.id}_principal", "Substitute has been assigned")
        ]
        
        for group, message in notifications:
            # Skip if sending to assigned teacher who is also the requesting teacher
            if group == f"user_{request.requested_by.id}" and request.assigned_teacher == request.requested_by:
                continue
                
            content["content"]["message"] = message
            async_to_sync(channel_layer.group_send)(group, content)
        
        # Create database notification for each recipient
        Notification.objects.create(
            user=request.assigned_teacher,
            content=f"You've been assigned to teach {request.subject} on {request.date}",
            notification_type='ASSIGNMENT'
        )
        
        if request.requested_by != request.assigned_teacher:
            Notification.objects.create(
                user=request.requested_by,
                content=f"{request.assigned_teacher.get_full_name()} has been assigned to your request for {request.subject}",
                notification_type='ASSIGNMENT'
            )
        
        # Create notifications for school staff
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        school_staff = User.objects.filter(
            school_staff__school=request.school,
            school_staff__role__in=['ADMIN', 'PRINCIPAL']
        )
        
        for staff in school_staff:
            Notification.objects.create(
                user=staff,
                content=f"{request.assigned_teacher.get_full_name()} has been assigned to teach {request.subject} on {request.date}",
                notification_type='ASSIGNMENT'
            )
            
        # Send confirmation email to assigned teacher
        send_confirmation_email.delay(request_id)
        
        return "Notifications sent successfully"
        
    except SubstituteRequest.DoesNotExist:
        return "Request not found"
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Error: {str(e)}"

@shared_task
def send_confirmation_email(request_id):
    """Send confirmation email to assigned teacher with improved reliability"""
    logger.info(f"Sending confirmation email for request: {request_id}")
    
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        teacher = request.assigned_teacher
        
        subject = f"Confirmation: Substitute Teaching Assignment - {request.subject}"
        message = f"""
Dear {teacher.get_full_name()},

Your substitute teaching assignment has been confirmed.

Details:
School: {request.school.school_name}
Subject: {request.subject}
Grade: {request.grade}
Date: {request.date}
Time: {request.start_time} - {request.end_time}

Additional Information:
Guest Meeting Link: {request.meeting_link if request.mode == 'ONLINE' else 'N/A'}
Host Meeting Link: {request.host_link if request.mode == 'ONLINE' else 'N/A'}
Special Instructions: {request.special_instructions}

Best regards,
{request.school.school_name} Team
"""
        
        logger.info(f"Sending confirmation email to: {teacher.email}")
        
        # Use standalone script instead of Django email
        from_email = f"{request.school.school_name} <pratikrana507@gmail.com>"
        success = send_email_via_script(
            teacher.email,
            subject,
            message,
            from_email
        )
        
        if success:
            logger.info(f"✅ Confirmation email successfully sent to {teacher.email}")
            return f"Confirmation email sent successfully to {teacher.email}"
        else:
            logger.error(f"❌ Failed to send confirmation email to {teacher.email}")
            return f"Failed to send confirmation email to {teacher.email}"
                
    except SubstituteRequest.DoesNotExist:
        logger.error(f"Request {request_id} not found!")
        return f"Request {request_id} not found"
        
    except Exception as e:
        logger.error(f"Error preparing confirmation email: {str(e)}")
        return f"Error preparing confirmation email: {str(e)}"
