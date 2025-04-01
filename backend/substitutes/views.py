# views.py

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.utils import timezone
from .models import SubstituteRequest, RequestInvitation
# from .tasks import send_assignment_notifications
from .serializers import SubstituteRequestSerializer, SubstituteRequestDetailSerializer, TeacherInvitationSerializer, SubstituteRequestCreateSerializer
from teaching_sessions.models import TeachingSession


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_form_options(request):
    """Return all options needed for the substitute request form"""
    from .models import SubstituteRequest
    
    return Response({
        'subjects': dict(SubstituteRequest.SUBJECTS),
        'grades': dict(SubstituteRequest.GRADE_CHOICES),
        'sections': dict(SubstituteRequest.SECTION),
        'priorities': dict(SubstituteRequest.PRIORITY_CHOICES),
        'modes': dict(SubstituteRequest.MODE_CHOICES),
    })

class SubstituteRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Substitute Requests
    """
    queryset = SubstituteRequest.objects.all()
    serializer_class = SubstituteRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """
        Create a new substitute request
        """
        
        
        serializer = SubstituteRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        substitute_request = serializer.save()
        
        # Notify teachers about the new request
        # send_assignment_notifications.delay(substitute_request.id)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """
        Update an existing substitute request
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = SubstituteRequestSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        substitute_request = serializer.save()
        
        # Notify teachers about the updated request
        # send_assignment_notifications.delay(substitute_request.id)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a substitute request
        """
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific substitute request
        """
        instance = self.get_object()
        serializer = SubstituteRequestDetailSerializer(instance)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """
        List all substitute requests
        """
        queryset = self.get_queryset()
        serializer = SubstituteRequestSerializer(queryset, many=True)
        return Response(serializer.data)
    
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
        
        try:
            if user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL', 'INTERNAL_TEACHER']:
                return SubstituteRequest.objects.filter(school=user.school)
        except AttributeError:
            # Handle case where user does not have a school attribute
            return SubstituteRequest.objects.none()
        finally:   
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