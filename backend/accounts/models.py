from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import uuid
from django.core.exceptions import ValidationError
from django.utils import timezone

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('SCHOOL_ADMIN', 'School Administrator'),
        ('PRINCIPAL', 'School Principal'),
        ('INTERNAL_TEACHER', 'Internal Teacher'),
        ('EXTERNAL_TEACHER', 'External Teacher'),
        ('STUDENT', 'Student'),
    )
    
    VERIFICATION_STATUS = (
        ('PENDING', 'Pending'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected')
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    is_verified = models.BooleanField(default=False)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS,
        default='PENDING'
    )
    profile_completed = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'user_type']
    
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='accounts_user_set',  # Custom related_name
        related_query_name='accounts_user'
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='accounts_user_set',  # Custom related_name
        related_query_name='accounts_user'
    )
        




class School(models.Model):
    CATEGORY_CHOICES = (
        ('PRIMARY', 'Primary School'),
        ('MIDDLE', 'Middle School'),
        ('SECONDARY', 'Secondary School'),
        ('HIGHER_SECONDARY', 'Higher Secondary School'),
        ('DEGREE_COLLEGE', 'Degree College'),
        ('UNIVERSITY', 'University'),
        ('OTHER', 'Other'),
    )
    
    BOARDS = (
        ('CBSE', 'CBSE'), 
        ('ICSE', 'ICSE'), 
        ('IB', 'IB'), 
        ('PUNJAB', 'Punjab Board'), 
        ('HARYANA', 'Haryana Board'),
        ('HIMACHAL', 'Himachal Board'),
        ('RAJASTHAN', 'Rajasthan Board'),
        ('UP', 'Uttar Pradesh Board'),
        ('MP', 'Madhya Pradesh Board'),
        ('BIHAR', 'Bihar Board'),
        ('JHARKHAND', 'Jharkhand Board'),
        ('WEST_BENGAL', 'West Bengal Board'),
        ('ODISHA', 'Odisha Board'),
        ('ASSAM', 'Assam Board'),
        ('NAGALAND', 'Nagaland Board'),
        ('ARUNACHAL', 'Arunachal Pradesh Board'),
        ('MANIPUR', 'Manipur Board'),
        ('MEGHALAYA', 'Meghalaya Board'),
        ('TRIPURA', 'Tripura Board'),
        ('MIZORAM', 'Mizoram Board'),
        ('SIKKIM', 'Sikkim Board'),
        ('GOA', 'Goa Board'),
        ('GUJARAT', 'Gujarat Board'),
        ('MAHARASHTRA', 'Maharashtra Board'),
        ('KARNATAKA', 'Karnataka Board'),
        ('KERALA', 'Kerala Board'),
        ('TAMIL_NADU', 'Tamil Nadu Board'),
        ('TELANGANA', 'Telangana Board'),
        ('ANDHRA', 'Andhra Pradesh Board'),
        ('UTTARAKHAND', 'Uttarakhand Board'),
        ('JAMMU', 'Jammu & Kashmir Board'),
        ('CHHATTISGARH', 'Chhattisgarh Board'),
        ('DELHI', 'Delhi Board'),
        ('OTHER', 'Other Board')
    )
    
    SUBSCRIPTIONS = (
        ('BASIC', 'Basic'),
        ('STANDARD', 'Standard'), 
        ('PREMIUM', 'Premium'), 
        ('ENTERPRISE', 'Enterprise'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='school_profile')
    school_name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    website = models.URLField(blank=True)
    contact_person = models.CharField(max_length=255)
    board_type = models.CharField(max_length=50, choices=BOARDS)
    registration_number = models.CharField(max_length=50, unique=True)
    established_year = models.IntegerField()
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    subscription_status = models.CharField(max_length=20, choices=SUBSCRIPTIONS, default='BASIC')
    # Algorithm settings
    matching_algorithm_settings = models.JSONField(
        default=dict,
        help_text="Custom settings for teacher matching algorithm"
    )

    @property
    def get_algorithm_settings(self):
        """Get algorithm settings with defaults"""
        default_settings = {
            'batch_size': 10,
            'wait_time_minutes': 10,
            'weights': {
                'qualification': {
                    'PhD': 3,
                    'Masters': 2,
                    'Bachelors': 1
                },
                'rating_multiplier': {
                    'factor': 2.0
                },
                'experience_multiplier': {
                    'factor': 0.5
                }
            }
        }
        
        # Deep merge of nested dictionaries
        result = default_settings.copy()
        
        # If there are no saved settings, return defaults
        if not self.matching_algorithm_settings:
            return result
            
        # Merge top level fields
        for key, value in self.matching_algorithm_settings.items():
            if key != 'weights':
                result[key] = value
                
        # Handle weights dictionary specially for deep merging
        if 'weights' in self.matching_algorithm_settings:
            for weight_key, weight_value in self.matching_algorithm_settings['weights'].items():
                if weight_key in result['weights']:
                    if isinstance(weight_value, dict) and isinstance(result['weights'][weight_key], dict):
                        # Deep merge for nested dictionaries like qualification
                        result['weights'][weight_key].update(weight_value)
                    else:
                        # Direct replacement for simple values
                        result['weights'][weight_key] = weight_value
                else:
                    # Add new weight categories not in defaults
                    result['weights'][weight_key] = weight_value
                    
        return result

class TeacherProfile(models.Model):
    AVAILABILITY_STATUS = (
        ('AVAILABLE', 'Available'),
        ('BUSY', 'Busy'),
        ('UNAVAILABLE', 'Unavailable'),
    )
    
    QUALIFICATION_CHOICES = (
        ('BTECH', 'B.Tech'),
        ('MTECH', 'M.Tech'),
        ('BCA', 'BCA'),
        ('MCA', 'MCA'),
        ('BSC', 'B.Sc'),
        ('MSC', 'M.Sc'),
        ('BA', 'B.A'),
        ('MA', 'M.A'),
        ('BBA', 'BBA'),
        ('MBA', 'MBA'),
        ('MPHIL', 'M.Phil'),   
        ('PHD', 'PhD'),
        ('OTHER', 'Other'),
    )
    
    SUBJECTS = (
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
    )

    TEACHER_TYPE_CHOICES = (
        ('INTERNAL', 'Internal Teacher'),
        ('EXTERNAL', 'External Teacher'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    school = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True)
    teacher_type = models.CharField(max_length=20, choices=TEACHER_TYPE_CHOICES)
    qualification = models.JSONField()
    subjects = models.JSONField()  # Store as array of subjects
    experience_years = models.IntegerField()
    preferred_classes = models.JSONField(default=list)  # Store class ranges
    preferred_boards = models.JSONField(default=list)  # Store preferred board types
    teaching_methodology = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_STATUS)
    availability_schedule = models.JSONField(default=dict)  # Store weekly schedule
    languages = models.JSONField(default=list)  # Store languages known
    can_teach_online = models.BooleanField(default=True)
    can_travel = models.BooleanField(default=True)
    document_verification_status = models.CharField(
        max_length=20,
        choices=[('PENDING', 'Pending'), ('VERIFIED', 'Verified'), ('REJECTED', 'Rejected')],
        default='PENDING'
    )
    travel_radius = models.IntegerField(default=0)  # in kilometers
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_sessions = models.IntegerField(default=0)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.teacher_type == 'INTERNAL' and not self.school:
            raise ValidationError('Internal teachers must be associated with a school.')
        if self.teacher_type == 'EXTERNAL' and self.school:
            raise ValidationError('External teachers should not be associated with a school.')

class StudentProfile(models.Model):
    GRADE_CHOICES = (
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
    )
    
    SECTION = (
        ('A', 'A'), 
        ('B', 'B'), 
        ('C', 'C'), 
        ('D', 'D'), 
        ('E', 'E'),
        ('Other', 'Other'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, related_name='students')
    grade = models.CharField(max_length=20, choices=GRADE_CHOICES)
    section = models.CharField(max_length=10, choices=SECTION)
    roll_number = models.CharField(max_length=20)
    parent_name = models.CharField(max_length=255)
    parent_phone = models.CharField(max_length=15)
    parent_email = models.EmailField()
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SchoolStaff(models.Model):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrator'),
        ('PRINCIPAL', 'Principal'),
        ('TEACHER', 'Teacher'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_staff')
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['school', 'role']),
            models.Index(fields=['user']),
        ]
        unique_together = ['user', 'school']

    def __str__(self):
        return f"{self.user.username} - {self.role} at {self.school.school_name}"
    

class TeacherAvailability(models.Model):
    """
    Enhanced TeacherAvailability model with better validation and utility methods
    """
    RECURRENCE_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('CUSTOM', 'Custom')
    ]

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('BUSY', 'Busy'),
        ('TENTATIVE', 'Tentative')
    ]

    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='availabilities'
    )
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        null=True, blank=True
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='AVAILABLE'
    )
    preferred_subjects = models.JSONField(
        default=list,
        help_text="List of preferred subjects for this time slot"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']
        indexes = [
            models.Index(fields=['teacher', 'date', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')),
                name='check_end_time_after_start_time'
            )
        ]

    def clean(self):
        if self.teacher.user_type not in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            raise ValidationError('Only teachers can have availability records.')

        if self.is_recurring and not self.recurrence_pattern:
            raise ValidationError('Recurrence pattern is required for recurring availability.')

        if self.recurrence_pattern and not self.is_recurring:
            raise ValidationError('Is recurring must be True when recurrence pattern is set.')

        if self.date < timezone.now().date():
            raise ValidationError('Cannot set availability for past dates.')

        # Allow overlapping records with different statuses
        overlapping = TeacherAvailability.objects.filter(
            teacher=self.teacher,
            date=self.date,
            status=self.status  # Only check for overlaps with the same status
        ).exclude(id=self.id).filter(
            models.Q(start_time__lt=self.end_time) &
            models.Q(end_time__gt=self.start_time)
        )

        if overlapping.exists():
            raise ValidationError(f'This time slot overlaps with existing availability with status "{self.status}".')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)





    @property
    def duration(self):
        """Returns the duration of the availability in minutes"""
        combined_start = timezone.make_aware(
            timezone.datetime.combine(self.date, self.start_time)
        )
        combined_end = timezone.make_aware(
            timezone.datetime.combine(self.date, self.end_time)
        )
        return (combined_end - combined_start).seconds // 60

    def is_available_for_slot(self, start_time, end_time, date=None):
        """Check if teacher is available for a specific time slot"""
        check_date = date or self.date
        return (
            self.status == 'AVAILABLE' and
            self.date == check_date and
            self.start_time <= start_time and
            self.end_time >= end_time
        )