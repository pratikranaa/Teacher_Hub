# models.py
from django.db import models
from django.conf import settings
from substitutes.models import SubstituteRequest

class TeachingSession(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    MODE_CHOICES = (
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
    )
    substitute_request = models.OneToOneField(
        SubstituteRequest,
        on_delete=models.CASCADE,
        related_name='session'
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teaching_sessions'
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='attended_sessions',
        blank=True
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='SCHEDULED'
    )
    feedback = models.TextField(blank=True, null=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='ONLINE')
    is_recorded = models.BooleanField(default=True)

    def __str__(self):
        return f"Session for {self.substitute_request.subject} on {self.start_time.date()}"

    def add_student(self, student):
        if student.school == self.substitute_request.school and \
           student.grade == self.substitute_request.grade and \
           student.section == self.substitute_request.section:
            self.students.add(student)
        else:
            raise ValueError("Student does not meet the criteria for this session.")
        
# teaching_sessions/models.py

from django.db import models
from django.utils import timezone
from datetime import timedelta

class SessionRecording(models.Model):
    session = models.OneToOneField('TeachingSession', on_delete=models.CASCADE)
    recording_url = models.URLField(blank=True, null=True)
    duration = models.DurationField(blank=True, null=True)
    size = models.BigIntegerField(help_text="Size in bytes", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    
    # JioMeet specific fields
    jiomeet_id = models.CharField(max_length=20, blank=True, null=True)
    room_pin = models.CharField(max_length=20, blank=True, null=True)
    history_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(
        max_length=20, 
        choices=[
            ('STARTED', 'Started'),
            ('COMPLETED', 'Completed'),
            ('FAILED', 'Failed')
        ],
        default='STARTED'
    )

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=365)
        super().save(*args, **kwargs)
        
# teaching_sessions/models.py

class SessionReport(models.Model):
    session = models.OneToOneField('TeachingSession', on_delete=models.CASCADE)
    attendance = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    attendance_count = models.PositiveIntegerField(default=0)
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    summary = models.TextField(blank=True)
    teacher_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)