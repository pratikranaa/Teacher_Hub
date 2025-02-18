# views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import TeachingSession, SessionRecording, SessionReport
from .serializers import TeachingSessionSerializer, AddStudentSerializer
from .permissions import IsAssignedTeacher
from accounts.models import User
from .utils import start_recording, stop_recording

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
            # Start recording logic
            session.is_recorded = True
            session.save()
            start_recording(session)
            # Integrate with recording service
        return Response({'status': 'Session started'})
    
    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        session = self.get_object()
        if session.status != 'ONGOING':
            return Response({'detail': 'Session cannot be ended.'}, status=status.HTTP_400_BAD_REQUEST)

        # Stop recording if applicable
        if session.is_recorded:
            # Stop recording logic
            recording_url = stop_recording(session)  # Obtain from recording service
            SessionRecording.objects.create(session=session, recording_url=recording_url)
        
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