# views.py

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.utils import timezone
from .models import SubstituteRequest, RequestInvitation
from .tasks import send_assignment_notifications
from .serializers import SubstituteRequestSerializer, RequestInvitationSerializer
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