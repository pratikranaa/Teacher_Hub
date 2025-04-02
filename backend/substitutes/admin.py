from django.contrib import admin
from .models import SubstituteRequest, RequestInvitation, Notification

@admin.register(SubstituteRequest)
class SubstituteRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'subject', 'grade', 'date', 'start_time', 'end_time', 'status', 'requested_by', 'assigned_teacher']
    list_filter = ['status', 'date', 'subject', 'grade', 'school']
    search_fields = ['subject', 'description', 'requested_by__email', 'assigned_teacher__email']
    date_hierarchy = 'date'

@admin.register(RequestInvitation)
class RequestInvitationAdmin(admin.ModelAdmin):
    list_display = ['id', 'substitute_request', 'teacher', 'status', 'invited_at', 'responded_at', 'batch_number']
    list_filter = ['status', 'batch_number', 'invited_at']
    search_fields = ['teacher__email', 'substitute_request__subject', 'response_note']
    raw_id_fields = ['substitute_request', 'teacher']
    readonly_fields = ['invited_at']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'content', 'notification_type', 'is_read']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['user__email', 'content']
    raw_id_fields = ['user']
