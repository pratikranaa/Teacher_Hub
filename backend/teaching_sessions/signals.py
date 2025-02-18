# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from substitutes.models import SubstituteRequest
from .models import TeachingSession
from accounts.models import StudentProfile

@receiver(post_save, sender=SubstituteRequest)
def create_teaching_session(sender, instance, created, **kwargs):
    if instance.status == 'ASSIGNED' and not hasattr(instance, 'session'):
        session = TeachingSession.objects.create(
            substitute_request=instance,
            teacher=instance.assigned_teacher,
            start_time=instance.start_time,
            end_time=instance.end_time,
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