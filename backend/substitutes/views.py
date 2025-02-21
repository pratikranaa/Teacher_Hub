# views.py

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.utils import timezone
from .models import SubstituteRequest, RequestInvitation
from .tasks import send_assignment_notifications
from .serializers import SubstituteRequestSerializer, RequestInvitationSerializer, SubstituteRequestDetailSerializer, TeacherInvitationSerializer
from teaching_sessions.models import TeachingSession

class SubstituteRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Substitute Requests
    """
    queryset = SubstituteRequest.objects.all()
    serializer_class = SubstituteRequestSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept_request(self, request, pk=None):
        """
        Teacher accepts a substitute request.
        """
        substitute_request = self.get_object()
        teacher = request.user
        try:
            invitation = RequestInvitation.objects.get(
                substitute_request=substitute_request,
                teacher=teacher,
                status='PENDING'
            )
            invitation.status = 'ACCEPTED'
            invitation.responded_at = timezone.now()
            invitation.save()
            
            substitute_request.assigned_teacher = teacher
            substitute_request.status = 'ASSIGNED'
            substitute_request.save()
            
            # Create a TeachingSession
            TeachingSession.objects.create(
                substitute_request=substitute_request,
                teacher=teacher,
                start_time=substitute_request.start_time,
                end_time=substitute_request.end_time,
                status='SCHEDULED'
            )
            
            # Withdraw other invitations
            RequestInvitation.objects.filter(
                substitute_request=substitute_request,
                status='PENDING'
            ).update(status='WITHDRAWN')
            
            # Send assignment notification
            send_assignment_notifications.delay(substitute_request.id)
            
            return Response({'detail': 'You have accepted the request.'}, status=status.HTTP_200_OK)
        except RequestInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found or already responded.'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def decline_request(self, request, pk=None):
        """
        Teacher declines a substitute request.
        """
        substitute_request = self.get_object()
        teacher = request.user
        try:
            invitation = RequestInvitation.objects.get(
                substitute_request=substitute_request,
                teacher=teacher,
                status='PENDING'
            )
            invitation.status = 'DECLINED'
            invitation.responded_at = timezone.now()
            invitation.save()
            return Response({'detail': 'You have declined the request.'}, status=status.HTTP_200_OK)
        except RequestInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found or already responded.'}, status=status.HTTP_400_BAD_REQUEST)

    def get_serializer_class(self):
        if self.action in ['retrieve', 'invitation_history']:
            return SubstituteRequestDetailSerializer
        return SubstituteRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL', 'INTERNAL_TEACHER']:
            return SubstituteRequest.objects.filter(school=user.school)
        return SubstituteRequest.objects.none()

    @action(detail=True, methods=['get'])
    def invitation_history(self, request, pk=None):
        """
        Get detailed invitation history for a substitute request
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def teacher_profile(self, request, pk=None, teacher_id=None):
        """
        Get detailed teacher profile from invitation
        """
        try:
            invitation = RequestInvitation.objects.get(
                substitute_request_id=pk,
                teacher_id=teacher_id
            )
            teacher_data = TeacherInvitationSerializer().get_teacher_details(invitation)
            return Response(teacher_data)
        except RequestInvitation.DoesNotExist:
            return Response(
                {'detail': 'Teacher invitation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )