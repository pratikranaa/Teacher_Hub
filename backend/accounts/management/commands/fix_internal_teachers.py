from django.core.management.base import BaseCommand
from accounts.models import User, TeacherProfile, SchoolStaff

class Command(BaseCommand):
    help = 'Creates missing SchoolStaff entries for internal teachers'

    def handle(self, *args, **options):
        internal_teachers = User.objects.filter(
            user_type='INTERNAL_TEACHER'
        ).exclude(
            school_staff__isnull=False
        )

        created_count = 0
        for teacher in internal_teachers:
            try:
                teacher_profile = TeacherProfile.objects.get(user=teacher)
                if teacher_profile.school:
                    SchoolStaff.objects.create(
                        user=teacher,
                        school=teacher_profile.school,
                        role='TEACHER'
                    )
                    created_count += 1
            except TeacherProfile.DoesNotExist:
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} SchoolStaff entries'
            )
        )
