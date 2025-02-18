# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, School, TeacherProfile, StudentProfile, SchoolStaff, TeacherAvailability


class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {'fields': ('user_type', 'phone_number', 'profile_image', 'is_verified')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('user_type', 'phone_number', 'profile_image', 'is_verified')}),
    )
    list_display = ('username', 'email', 'user_type', 'is_staff', 'is_active', 'is_verified')
    list_filter = ('user_type', 'is_staff', 'is_active', 'is_verified')

admin.site.register(User, UserAdmin)

class SchoolAdmin(admin.ModelAdmin):
    list_display = ('school_name', 'category', 'city', 'state', 'country', 'verified')
    list_filter = ('category', 'board_type', 'verified', 'subscription_status')
    search_fields = ('school_name', 'city', 'state', 'country')

admin.site.register(School, SchoolAdmin)

class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'school', 'teacher_type', 'qualification', 'experience_years', 'availability_status')
    list_filter = ('teacher_type', 'qualification', 'availability_status')
    search_fields = ('user__username', 'school__school_name', 'qualification')

admin.site.register(TeacherProfile, TeacherProfileAdmin)


class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'school', 'grade', 'section', 'roll_number', 'parent_name')
    list_filter = ('grade', 'section')
    search_fields = ('user__username', 'school__school_name', 'roll_number', 'parent_name')

admin.site.register(StudentProfile, StudentProfileAdmin)

class SchoolStaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'school', 'role', 'department', 'employee_id', 'joining_date')
    list_filter = ('role', 'department')
    search_fields = ('user__username', 'school__school_name', 'employee_id')

admin.site.register(SchoolStaff, SchoolStaffAdmin)

class TeacherAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'date', 'start_time', 'end_time', 'is_recurring', 'recurrence_pattern')
    list_filter = ('is_recurring', 'recurrence_pattern')
    search_fields = ('teacher__username', 'date')

admin.site.register(TeacherAvailability, TeacherAvailabilityAdmin)

