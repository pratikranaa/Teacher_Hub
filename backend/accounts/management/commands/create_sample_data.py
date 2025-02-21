from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import (
    School, TeacherProfile, StudentProfile, SchoolStaff, TeacherAvailability
)
from django.utils import timezone
from datetime import timedelta, time
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates sample data for testing with multiple profiles for each user type'

    def handle(self, *args, **kwargs):
        # Create Schools
        schools = []
        school_names = [
            "Delhi Public School", "St. Mary's School", "Modern School",
            "Kendriya Vidyalaya", "Army Public School", "Ryan International",
            "DAV Public School", "Cambridge International", "Oxford Public School",
            "Heritage School"
        ]

        for i, name in enumerate(school_names):
            school = School.objects.create(
                school_name=name,
                category="SECONDARY",
                address=f"{i+1} Education Street",
                city="New Delhi",
                state="Delhi",
                country="India",
                postal_code=f"11000{i+1}",
                website=f"https://www.{name.lower().replace(' ', '')}.edu",
                contact_person=f"Principal {i+1}",
                board_type="CBSE",
                registration_number=f"SCH{i+1}2024",
                established_year=1972+i,
                subscription_status="STANDARD",
                matching_algorithm_settings={
                    "experience_weight": 0.3,
                    "rating_weight": 0.4,
                    "distance_weight": 0.3
                }
            )
            schools.append(school)
            
        def create_time_slots():
            slots = []
            start = time(9, 0)  # 9:00 AM
            for _ in range(8):  # 8 time slots
                end = time(start.hour + 1, start.minute)
                slots.append((start, end))
                start = end
            return slots

        time_slots = create_time_slots()

        # Create School Admins (10)
        for i in range(10):
            admin = User.objects.create_user(
                username=f"admin{i+1}",
                email=f"admin{i+1}@school.edu",
                password="admin123",
                user_type="SCHOOL_ADMIN",
                phone_number=f"98765{i:05d}",
                profile_verification_status="VERIFIED",
                profile_completed=True
            )
            SchoolStaff.objects.create(
                user=admin,
                school=schools[i],
                role="ADMIN",
                department="Administration",
                employee_id=f"ADM00{i+1}",
                joining_date=timezone.now().date()
            )

        # Create Principals (10)
        for i in range(10):
            principal = User.objects.create_user(
                username=f"principal{i+1}",
                email=f"principal{i+1}@school.edu",
                password="principal123",
                user_type="PRINCIPAL",
                phone_number=f"98766{i:05d}",
                profile_verification_status="VERIFIED",
                profile_completed=True
            )
            SchoolStaff.objects.create(
                user=principal,
                school=schools[i],
                role="PRINCIPAL",
                department="Management",
                employee_id=f"PRI00{i+1}",
                joining_date=timezone.now().date()
            )

        # Modify Internal Teachers creation
        subjects_pool = ["MATHS", "PHYSICS", "CHEMISTRY", "BIOLOGY", "ENGLISH", "HISTORY", "GEOGRAPHY", "COMPUTER"]
        qualifications_pool = ["BTECH", "MCA", "MSC", "MA", "PHD"]
        languages_pool = ["English", "Hindi", "Sanskrit", "French", "German"]
        
        for i in range(10):
            teacher = User.objects.create_user(
                username=f"teacher{i+1}",
                email=f"teacher{i+1}@school.edu",
                password="teacher123",
                user_type="INTERNAL_TEACHER",
                phone_number=f"98767{i:05d}",
                profile_verification_status="VERIFIED",
                profile_completed=True
            )
            
            chosen_subjects = random.sample(subjects_pool, 3)
            TeacherProfile.objects.create(
                user=teacher,
                school=schools[i],
                teacher_type="INTERNAL",
                qualification=random.sample(qualifications_pool, 2),
                subjects=chosen_subjects,
                experience_years=random.randint(2, 15),
                preferred_classes=["11", "12"],
                preferred_boards=["CBSE", "ICSE"],
                teaching_methodology="Interactive and practical approach",
                hourly_rate=random.randint(800, 1500),
                availability_status="AVAILABLE",
                languages=random.sample(languages_pool, 2),
                can_teach_online=True,
                can_travel=True,
                rating=round(random.uniform(3.5, 5.0), 1)
            )


        # Modify External Teachers creation with similar changes
        for i in range(10):
            teacher = User.objects.create_user(
                username=f"external{i+1}",
                email=f"external{i+1}@teacher.com",
                password="external123",
                user_type="EXTERNAL_TEACHER",
                phone_number=f"98768{i:05d}",
                profile_verification_status="VERIFIED",
                profile_completed=True
            )
            
            chosen_subjects = random.sample(subjects_pool, 3)
            TeacherProfile.objects.create(
                user=teacher,
                teacher_type="EXTERNAL",
                qualification=random.sample(qualifications_pool, 2),
                subjects=chosen_subjects,
                experience_years=random.randint(5, 20),
                preferred_classes=["9", "10", "11", "12"],
                preferred_boards=["CBSE", "ICSE", "IB"],
                teaching_methodology="Focus on conceptual learning",
                hourly_rate=random.randint(1000, 2000),
                availability_status="AVAILABLE",
                languages=random.sample(languages_pool, 3),
                can_teach_online=True,
                can_travel=bool(random.getrandbits(1)),
                rating=round(random.uniform(3.5, 5.0), 1)
            )


    # ... Keep existing code until student creation ...
    
        # Create Students (10 per school)
        grades = ["9", "10", "11", "12"]
        sections = ["A", "B", "C"]
        
        student_counter = 1  # Global counter for unique student IDs
        
        for school in schools:
            for i in range(10):
                school_identifier = str(school.id)[:4]
                username = f"student_{student_counter}"  # Use global counter instead of i
                student = User.objects.create_user(
                    username=username,
                    email=f"student{student_counter}@{school_identifier}.edu",
                    password="student123",
                    user_type="STUDENT",
                    phone_number=f"98769{student_counter:05d}",  # Using 5 digits for phone number
                    profile_verification_status="VERIFIED",
                    profile_completed=True
                )
                StudentProfile.objects.create(
                    user=student,
                    school=school,
                    grade=random.choice(grades),
                    section=random.choice(sections),
                    roll_number=f"{random.choice(grades)}{random.choice(sections)}{student_counter:03d}",
                    parent_name=f"Parent {student_counter}",
                    parent_phone=f"98770{student_counter:05d}",  # Using 5 digits for phone number
                    parent_email=f"parent{student_counter}@{school_identifier}.edu",
                    date_of_birth=timezone.now().date() - timedelta(days=365*random.randint(14,18))
                )
                student_counter += 1  # Increment the counter after each student
    
    # ... Keep remaining code the same ...

        # Modify Teacher Availability creation
        teachers = User.objects.filter(user_type__in=['INTERNAL_TEACHER', 'EXTERNAL_TEACHER'])
        for teacher in teachers:
            for i in range(5):  # 5 availability slots per teacher
                start_time, end_time = random.choice(time_slots)
                TeacherAvailability.objects.create(
                    teacher=teacher,
                    date=timezone.now().date() + timedelta(days=i),
                    start_time=start_time,
                    end_time=end_time,
                    is_recurring=True,
                    recurrence_pattern="WEEKLY",
                    status="AVAILABLE",
                    preferred_subjects=TeacherProfile.objects.get(user=teacher).subjects[:2]  # Use first 2 subjects
                )

        self.stdout.write(self.style.SUCCESS('Successfully created sample data'))