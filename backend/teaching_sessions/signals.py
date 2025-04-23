# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from substitutes.models import SubstituteRequest
from .models import TeachingSession
from accounts.models import StudentProfile
from django.utils import timezone
import datetime

@receiver(post_save, sender=SubstituteRequest)
def create_teaching_session(sender, instance, created, **kwargs):
    # Only create teaching session when a request is assigned to a teacher
    if instance.status == 'ASSIGNED' and instance.assigned_teacher and not TeachingSession.objects.filter(substitute_request=instance).exists():
        # Convert date and time fields to proper datetime objects if needed
        if isinstance(instance.date, (str, datetime.date)) and not isinstance(instance.date, datetime.datetime):
            # Convert date to datetime using start_time for the time component
            date = instance.date
            if isinstance(date, str):
                date = datetime.datetime.strptime(date, '%Y-%m-%d').date()
                
            # Handle time fields based on their type
            start_time = instance.start_time
            if isinstance(start_time, str):
                # Parse time string
                hours, minutes = map(int, start_time.split(':'))
                start_datetime = datetime.datetime.combine(date, datetime.time(hours, minutes))
            else:
                # Assume it's already a time object
                start_datetime = datetime.datetime.combine(date, start_time)
                
            end_time = instance.end_time
            if isinstance(end_time, str):
                # Parse time string
                hours, minutes = map(int, end_time.split(':'))
                end_datetime = datetime.datetime.combine(date, datetime.time(hours, minutes))
            else:
                # Assume it's already a time object
                end_datetime = datetime.datetime.combine(date, end_time)
        else:
            # If they're already datetime objects, use them directly
            start_datetime = instance.start_time
            end_datetime = instance.end_time
        
        # Create the teaching session with proper datetime values
        session = TeachingSession.objects.create(
            substitute_request=instance,
            teacher=instance.assigned_teacher,
            start_time=start_datetime,
            end_time=end_datetime,
            status='SCHEDULED',
        )
        
        # Automatically add students to the session
        students = StudentProfile.objects.filter(
            school=instance.school,
            grade=instance.grade,
            section=instance.section,
        )
        for student in students:
            session.students.add(student.user)