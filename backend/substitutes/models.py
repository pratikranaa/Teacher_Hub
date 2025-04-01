from django.db import models
from accounts.models import User, TeacherAvailability, School, TeacherProfile
from django.core.exceptions import ValidationError
from django.utils import timezone
from .utils import create_jiomeet_meeting
from django.db import models
from django.conf import settings

class SubstituteRequest(models.Model):
    """
    Model to handle substitute teacher requests
    """
    
    
    SUBJECTS = [
        ('MATHS', 'Mathematics'),
        ('SCIENCE', 'Science'),
        ('ENGLISH', 'English'),
        ('SOCIAL', 'Social Studies'),
        ('COMPUTER', 'Computer Science'),
        ('PHYSICS', 'Physics'),
        ('CHEMISTRY', 'Chemistry'),
        ('BIOLOGY', 'Biology'),
        ('HISTORY', 'History'),
        ('GEOGRAPHY', 'Geography'),
        ('CIVICS', 'Civics'),
        ('ECONOMICS', 'Economics'),
        ('BUSINESS', 'Business Studies'),
        ('ACCOUNTANCY', 'Accountancy'),
        ('COMMERCE', 'Commerce'),
        ('PSYCHOLOGY', 'Psychology'),
        ('PHILOSOPHY', 'Philosophy'),
        ('POLITICAL_SCIENCE', 'Political Science'),
        ('HINDI', 'Hindi'),
        ('SANSKRIT', 'Sanskrit'),
        ('FRENCH', 'French'),
        ('GERMAN', 'German'),
        ('SPANISH', 'Spanish'),
        ('JAPANESE', 'Japanese'),
        ('CHINESE', 'Chinese'),
        ('ITALIAN', 'Italian'),
        ('KOREAN', 'Korean'),
        ('OTHER', 'Other'),
    ]
    
    
    STATUS_CHOICES = [
            ('PENDING', 'Pending'),
            ('AWAITING_ACCEPTANCE', 'Awaiting Acceptance'),
            ('ASSIGNED', 'Assigned'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled')
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ]

    MODE_CHOICES = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('HYBRID', 'Hybrid')
    ]
    
    GRADE_CHOICES = [
        ('NURSERY', 'Nursery'),
        ('LKG', 'LKG'),
        ('UKG', 'UKG'),
        ('1', '1st'),
        ('2', '2nd'),
        ('3', '3rd'),
        ('4', '4th'),
        ('5', '5th'),
        ('6', '6th'),
        ('7', '7th'),
        ('8', '8th'),
        ('9', '9th'),
        ('10', '10th'),
        ('11', '11th'),
        ('12', '12th'),
        ('OTHER', 'Other'),
    ]

    SECTION = [
        ('A', 'A'), 
        ('B', 'B'), 
        ('C', 'C'), 
        ('D', 'D'), 
        ('E', 'E'),
        ('Other', 'Other'),
    ]

    school = models.ForeignKey(
        'accounts.School',  # Assuming you have a School model
        on_delete=models.CASCADE,
        related_name='substitute_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='requested_substitutions'
    )
    assigned_teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_substitutions'
    )
    original_teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='substituted_classes'
    )
    subject = models.CharField(
        max_length=20,
        choices=SUBJECTS,
    )
    grade = models.CharField(max_length=20, choices=GRADE_CHOICES)
    section = models.CharField(max_length=20, choices=SECTION, default='A')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )
    mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default='ONLINE'
    )
    description = models.TextField()
    requirements = models.JSONField(
        default=dict,
        help_text="Specific requirements for the substitute teacher", blank=True
    )
    meeting_link = models.URLField(null=True, blank=True)
    special_instructions = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['school', 'date', 'status']),
            models.Index(fields=['assigned_teacher', 'date']),
        ]

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError('End time must be after start time')
        
        if self.date < timezone.now().date():
            raise ValidationError('Cannot create request for past dates')
        
        if self.status == 'ASSIGNED' and not self.assigned_teacher:
            raise ValidationError('Assigned teacher is required when status is ASSIGNED')

    def save(self, *args, **kwargs):
        self.full_clean()
        # Generate meeting link for online mode
        if self.mode in ['ONLINE', 'HYBRID'] and self.status == 'ASSIGNED' and not self.meeting_link:
            self.generate_meeting_link()
        super().save(*args, **kwargs)

    def generate_meeting_link(self):
        """Generate meeting link using configured video service"""
        name = f"{self.original_teacher} | {self.school}"
        title = f"Online Substitute class for {self.school} | {self.subject} | {self.grade} | {self.date}"
        description = f"Substitute class for {self.subject} | {self.grade} | {self.date}"
        response_meeting = create_jiomeet_meeting(name, title, description)
        if 'meetingLink' in response_meeting:
            self.meeting_link = response_meeting['meetingLink']
        else:
            self.meeting_link = 'Please check with the School_Admin for meeting link'

    @property
    def duration(self):
        """Returns the duration of the request in minutes"""
        combined_start = timezone.make_aware(
            timezone.datetime.combine(self.date, self.start_time)
        )
        combined_end = timezone.make_aware(
            timezone.datetime.combine(self.date, self.end_time)
        )
        return (combined_end - combined_start).seconds // 60

    def get_matching_teachers(self):
        """Returns QuerySet of teachers matching the request criteria"""
        matching_teachers = TeacherAvailability.objects.filter(
            date=self.date,
            start_time__lte=self.start_time,
            end_time__gte=self.end_time,
            status='AVAILABLE'
        ).select_related('teacher')
        
        return matching_teachers

    def assign_teacher(self, teacher):
        """Assign a teacher to this request and update their availability."""
        if self.status != 'PENDING':
            raise ValidationError('Can only assign teachers to pending requests')

        # Fetch the teacher's availability that overlaps with the request time
        overlapping_availability = TeacherAvailability.objects.filter(
            teacher=teacher,
            date=self.date,
            start_time__lte=self.end_time,
            end_time__gte=self.start_time,
            status='AVAILABLE',
        ).first()

        if not overlapping_availability:
            raise ValidationError('Teacher is not available during the requested time slot')

        self.assigned_teacher = teacher
        self.status = 'ASSIGNED'
        self.save()

        # Split the availability into before, during, and after slots
        availabilities_to_create = []

        # Before the request
        if overlapping_availability.start_time < self.start_time:
            availabilities_to_create.append(TeacherAvailability(
                teacher=teacher,
                date=self.date,
                start_time=overlapping_availability.start_time,
                end_time=self.start_time,
                status='AVAILABLE',
            ))

        # During the request
        availabilities_to_create.append(TeacherAvailability(
            teacher=teacher,
            date=self.date,
            start_time=self.start_time,
            end_time=self.end_time,
            status='BUSY',
        ))

        # After the request
        if overlapping_availability.end_time > self.end_time:
            availabilities_to_create.append(TeacherAvailability(
                teacher=teacher,
                date=self.date,
                start_time=self.end_time,
                end_time=overlapping_availability.end_time,
                status='AVAILABLE',
            ))

        # Remove the original availability
        overlapping_availability.delete()

        # Bulk create the new availabilities
        TeacherAvailability.objects.bulk_create(availabilities_to_create)
        

class RequestInvitation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('WITHDRAWN', 'Withdrawn'),
        ('EXPIRED', 'Expired')
    ]
    
    substitute_request = models.ForeignKey(SubstituteRequest, 
                                         on_delete=models.CASCADE,
                                         related_name='invitations')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, 
                              on_delete=models.CASCADE,
                              related_name='substitute_invitations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    response_note = models.TextField(blank=True)  # For declined reasons
    batch_number = models.IntegerField(default=1)  # Track which batch this invitation was part of
    
    class Meta:
        unique_together = ('substitute_request', 'teacher')
        
# models.py

from django.db import models
from django.conf import settings

class Notification(models.Model):
    """
    Model to store user notifications.
    """
    NOTIFICATION_TYPES = [
        ('INVITATION', 'Invitation'),
        ('ASSIGNMENT', 'Assignment'),
        # Add more types as needed
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    
    def __str__(self):
        return f"{self.user.username} - {self.notification_type}"