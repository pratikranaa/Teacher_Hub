# serializers.py
from rest_framework import serializers
from .models import TeachingSession, SessionRecording, SessionReport
from accounts.models import User

User 

class AddStudentSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()

    def validate_student_id(self, value):
        try:
            student = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Student does not exist.")
        return value
    
from rest_framework import serializers
from django.contrib.auth.models import User

class SessionRecordingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionRecording
        fields = ['recording_url', 'created_at', 'expires_at']

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