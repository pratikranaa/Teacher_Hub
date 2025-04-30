# serializers.py
from rest_framework import serializers
from .models import TeachingSession, SessionRecording, SessionReport
from accounts.models import User
from django.contrib.auth import get_user_model

User = get_user_model()

class AddStudentSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()

    def validate_student_id(self, value):
        try:
            student = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Student does not exist.")
        return value


class SessionRecordingSerializer(serializers.ModelSerializer):
    session_details = serializers.SerializerMethodField()
    
    class Meta:
        model = SessionRecording
        fields = [
            'id', 'session', 'recording_url', 'duration', 
            'created_at', 'expires_at', 'status', 'session_details'
        ]
        read_only_fields = ['id', 'created_at', 'expires_at']
        
    def get_session_details(self, obj):
        """Get details about the teaching session"""
        session = obj.session
        request = session.substitute_request
        
        return {
            'id': session.id,
            'subject': request.subject,
            'grade': request.grade,
            'section': request.section,
            'date': request.date,
            'start_time': request.start_time,
            'end_time': request.end_time,
            'school_name': request.school.name if request.school else None,
            'teacher_name': f"{session.teacher.first_name} {session.teacher.last_name}".strip() if session.teacher else None,
        }

class SessionReportSerializer(serializers.ModelSerializer):
    attendance = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)

    class Meta:
        model = SessionReport
        fields = ['attendance', 'performance_notes', 'created_at']

class TeachingSessionSerializer(serializers.ModelSerializer):
    recording = SessionRecordingSerializer(read_only=True)
    report = SessionReportSerializer(read_only=True)

    class Meta:
        model = TeachingSession
        fields = '__all__'