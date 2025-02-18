# tasks.py

from celery import shared_task
from django.db.models import Q, F, Value, IntegerField, Case, When
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import SubstituteRequest, TeacherAvailability, RequestInvitation
from accounts.models import TeacherProfile, Notification

# substitutes/tasks.py

@shared_task
def match_teachers_to_request(request_id):
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        
        # Find all eligible teachers (both internal and external) except the requester
        matching_teachers = TeacherAvailability.objects.filter(
            Q(date=request.date) &
            Q(start_time__lte=request.start_time) &
            Q(end_time__gte=request.end_time) &
            Q(status='AVAILABLE') &
            Q(teacher__teacher_profile__subjects__icontains=request.subject)
        ).exclude(
            teacher=request.requested_by
        ).annotate(
            degree_weight=Value(
                Case(
                    When(teacher__teacher_profile__qualification='PhD', then=3),
                    When(teacher__teacher_profile__qualification='Masters', then=2),
                    default=1,
                    output_field=IntegerField(),
                )
            ),
            rating_weight=F('teacher__teacher_profile__rating') * 2,
            experience_weight=F('teacher__teacher_profile__experience_years') * 0.5
        ).order_by('-total_score')

        # Create invitations and notifications
        for teacher in matching_teachers:
            RequestInvitation.objects.create(
                substitute_request=request,
                teacher=teacher.teacher,
                status='PENDING'
            )
            
            # Send notifications
            Notification.objects.create(
                user=teacher.teacher,
                content=f"New substitute request for {request.subject} at {request.school.school_name}",
                notification_type='INVITATION'
            )
            
            # Send email
            send_invitation_email.delay(request.id, teacher.teacher.id)
            
        request.status = 'AWAITING_ACCEPTANCE'
        request.save()

    except SubstituteRequest.DoesNotExist:
        return

@shared_task
def send_invitation_email(request_id, teacher_id):
    """
    Send an invitation email to a teacher for a substitute request.
    """
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        teacher = TeacherProfile.objects.get(user_id=teacher_id)
        
        subject = f"Substitute Teaching Opportunity at {request.school.school_name}"
        accept_url = f"{settings.FRONTEND_URL}/accept_request/{request.id}/"
        decline_url = f"{settings.FRONTEND_URL}/decline_request/{request.id}/"
        message = f"""
        Dear {teacher.user.get_full_name()},
        
        You are invited to a substitute teaching request.
        
        Details:
        School: {request.school.school_name}
        Subject: {request.subject}
        Date: {request.date}
        Time: {request.start_time} - {request.end_time}
        
        Accept: {accept_url}
        Decline: {decline_url}
        
        Please respond within 1 hour.
        
        Best regards,
        School Administration
        """
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [teacher.user.email],
            fail_silently=False,
        )
    except (SubstituteRequest.DoesNotExist, TeacherProfile.DoesNotExist):
        return

@shared_task
def escalate_request(request_id):
    """
    Escalate request if not accepted within 1 hour.
    """
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        if request.status == 'AWAITING_ACCEPTANCE':
            # Invite next 20 teachers
            invited_teachers = RequestInvitation.objects.filter(
                substitute_request=request
            ).values_list('teacher_id', flat=True)
            
            # Get next set of teachers not already invited
            degree_weights = {
                'PhD': 3,
                'Masters': 2,
                'Bachelors': 1
            }
            
            matching_teachers = TeacherAvailability.objects.filter(
                Q(date=request.date) &
                Q(start_time__lte=request.start_time) &
                Q(end_time__gte=request.end_time) &
                Q(status='AVAILABLE') &
                Q(teacher__teacher_profile__subjects__icontains=request.subject) &
                ~Q(teacher_id__in=invited_teachers)
            ).annotate(
                degree_weight=Value(degree_weights.get(F('teacher__teacher_profile__qualification__0'), 0), output_field=IntegerField()),
                rating_weight=F('teacher__teacher_profile__rating') * 2,
                experience_weight=F('teacher__teacher_profile__experience_years') * 0.5
            ).annotate(
                total_score=F('degree_weight') + F('rating_weight') + F('experience_weight')
            ).order_by('-total_score')[:20]
            
            # Send invitations
            for availability in matching_teachers:
                teacher = availability.teacher
                RequestInvitation.objects.create(
                    substitute_request=request,
                    teacher=teacher,
                    status='PENDING'
                )
                send_invitation_email.delay(request.id, teacher.id)
    except SubstituteRequest.DoesNotExist:
        return

@shared_task
def send_assignment_notifications(request_id):
    """
    Send assignment notification to the assigned teacher.
    """
    try:
        request = SubstituteRequest.objects.get(id=request_id)
        teacher = request.assigned_teacher.teacher_profile
        
        subject = f"Assignment Confirmation for {request.subject} Class"
        message = f"""
        Dear {teacher.user.get_full_name()},
        
        You have been assigned to the substitute request.
        
        Details:
        School: {request.school.school_name}
        Subject: {request.subject}
        Date: {request.date}
        Time: {request.start_time} - {request.end_time}
        Meeting Link: {request.meeting_link}
        
        Please be prepared for the class.
        
        Best regards,
        School Administration
        """
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [teacher.user.email],
            fail_silently=False,
        )
    except SubstituteRequest.DoesNotExist:
        return