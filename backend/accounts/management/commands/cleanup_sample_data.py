from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import School, TeacherProfile, StudentProfile, SchoolStaff, TeacherAvailability

User = get_user_model()

class Command(BaseCommand):
    help = 'Cleans up all sample data created for testing'

    def handle(self, *args, **kwargs):
        # Delete in order to respect foreign key constraints
        TeacherAvailability.objects.all().delete()
        StudentProfile.objects.all().delete()
        TeacherProfile.objects.all().delete()
        SchoolStaff.objects.all().delete()
        School.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Successfully cleaned up all sample data'))