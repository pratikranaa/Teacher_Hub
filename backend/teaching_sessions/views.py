# views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import TeachingSession, SessionRecording, SessionReport
from .serializers import TeachingSessionSerializer, AddStudentSerializer, SessionRecordingSerializer
from .permissions import IsAssignedTeacher
from accounts.models import User
from .utils import start_recording, stop_recording, get_recording_status

class TeachingSessionViewSet(viewsets.ModelViewSet):
    queryset = TeachingSession.objects.all()
    serializer_class = TeachingSessionSerializer
    permission_classes = [IsAuthenticated, IsAssignedTeacher]

    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        session = self.get_object()
        if session.status != 'SCHEDULED':
            return Response({'detail': 'Session cannot be started.'}, status=status.HTTP_400_BAD_REQUEST)
        session.status = 'ONGOING'
        session.start_time = timezone.now()
        session.save()

        if session.mode == 'ONLINE':
            # Set recording flag, but don't start recording immediately
            session.is_recorded = True
            session.save()
            # Note: Recording will start automatically after 15 minutes
            # via a scheduled task or when someone checks for recording status
        return Response({'status': 'Session started'})
    
    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        session = self.get_object()
        if session.status != 'ONGOING':
            return Response({'detail': 'Session cannot be ended.'}, status=status.HTTP_400_BAD_REQUEST)

        # For recording handling
        if session.is_recorded:
            # Try to fetch recording URL
            recording_url = stop_recording(session)
            # Don't create a new recording if one already exists
            SessionRecording.objects.get_or_create(
                session=session,
                defaults={'recording_url': recording_url}
            )
        
        # Create session report
        report = SessionReport.objects.create(session=session)
        attendance_ids = request.data.get('attendance_ids', [])
        report.attendance.set(attendance_ids)
        report.performance_notes = request.data.get('performance_notes', '')
        report.save()

        session.status = 'COMPLETED'
        session.end_time = timezone.now()
        session.save()
        return Response({'status': 'Session ended'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel_session(self, request, pk=None):
        session = self.get_object()
        if session.status not in ['SCHEDULED', 'ONGOING']:
            return Response(
                {'detail': 'Session cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        session.status = 'CANCELLED'
        session.save()
        return Response({'status': 'Session cancelled'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='add-student', url_name='add_student')
    def add_student(self, request, pk=None):
        session = self.get_object()
        serializer = AddStudentSerializer(data=request.data)
        if serializer.is_valid():
            student_id = serializer.validated_data['student_id']
            try:
                student = User.objects.get(id=student_id)
                session.add_student(student)
                session.save()
                return Response({'status': 'Student added'}, status=status.HTTP_200_OK)
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def check_recording_status(self, request, pk=None):
        """Check if recording has started and initiate if needed"""
        session = self.get_object()
        
        if not session.is_recorded or session.status not in ['ONGOING', 'COMPLETED']:
            return Response({
                'status': 'NOT_RECORDED',
                'detail': 'This session is not being recorded'
            })
            
        # Try to start recording if it hasn't been started yet
        recording = SessionRecording.objects.filter(session=session).first()
        if not recording:
            recording = start_recording(session)
            if recording:
                return Response({
                    'status': 'STARTED',
                    'detail': 'Recording has been initiated'
                })
            else:
                return Response({
                    'status': 'WAITING',
                    'detail': 'Recording will start 15 minutes after session start'
                })
        
        # Check existing recording status
        status_val = get_recording_status(session)
        recording.refresh_from_db()
        
        return Response({
            'status': recording.status,
            'recording_url': recording.recording_url,
            'detail': f'Recording is {recording.status.lower()}'
        })

class SessionRecordingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for session recordings. Users can only view recordings associated with
    their school or sessions they taught/requested.
    """
    serializer_class = SessionRecordingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filter recordings based on user type and associations
        if not user.is_authenticated:
            return SessionRecording.objects.none()
        
        # School administrators and principals see all recordings for their school
        if user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            try:
                if hasattr(user, 'school_staff') and user.school_staff.school:
                    school = user.school_staff.school
                    return SessionRecording.objects.filter(
                        session__substitute_request__school=school
                    )
            except AttributeError:
                return SessionRecording.objects.none()
        
        # Teachers see recordings of sessions they taught or requested
        elif user.user_type in ['EXTERNAL_TEACHER', 'INTERNAL_TEACHER']:
            # Fix: Use Q objects to combine conditions instead of using | operator
            from django.db.models import Q
            return SessionRecording.objects.filter(
                Q(session__teacher=user) | 
                Q(session__substitute_request__requested_by=user)
            ).distinct()
        
        # Students see recordings of sessions they attended
        elif user.user_type == 'STUDENT':
            return SessionRecording.objects.filter(
                session__students=user
            )
        
        return SessionRecording.objects.none()
    
    @action(detail=True, methods=['get'])
    def fetch_recording_url(self, request, pk=None):
        """Fetch the latest recording URL from JioMeet"""
        recording = self.get_object()
        session = recording.session
        
        # If we don't have a recording URL yet but have a history_id
        if not recording.recording_url and recording.history_id and recording.status != 'FAILED':
            from .utils import fetch_recording_url
            # Try to fetch the recording URL using our improved function
            recording_url = fetch_recording_url(session)
            
            # Check if fetch was successful
            if recording_url:
                recording.refresh_from_db()  # Make sure we have latest data
                return Response({
                    "recording_url": recording.recording_url,
                    "status": recording.status,
                    "duration": recording.duration.total_seconds() if recording.duration else None,
                    "size": recording.size
                })
            
            # Try to start recording if the session is ongoing and no history_id
            if session.status == 'ONGOING':
                from .utils import start_recording
                recording_result = start_recording(session)
                if recording_result:
                    return Response({
                        "status": "STARTED",
                        "message": "Recording has been initiated"
                    })
                else:
                    return Response({
                        "status": "WAITING", 
                        "message": "Recording will start 15 minutes after session start"
                    })
            
            return Response(
                {"detail": "Recording not available yet or still processing"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # We have the recording URL, return it along with metadata
        return Response({
            "recording_url": recording.recording_url,
            "status": recording.status,
            "duration": recording.duration.total_seconds() if recording.duration else None,
            "size": recording.size
        })