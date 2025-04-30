# views.py

from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.utils import timezone
import datetime
from .models import SubstituteRequest, RequestInvitation
# from .tasks import send_assignment_notifications
from .serializers import SubstituteRequestSerializer, SubstituteRequestDetailSerializer, TeacherInvitationSerializer, SubstituteRequestCreateSerializer
from teaching_sessions.models import TeachingSession
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Add these views to your accounts app
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notification
from .serializers import NotificationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get user notifications"""
    notifications = Notification.objects.filter(user=request.user)
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    """Mark notification as read"""
    try:
        notification = Notification.objects.get(id=pk, user=request.user)
        notification.read = True
        notification.save()
        return Response({"status": "success"})
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_notifications(request):
    """Clear all notifications"""
    Notification.objects.filter(user=request.user).delete()
    return Response({"status": "success"})

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

@permission_classes([IsAuthenticated])
class SubstituteRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Substitute Requests
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SubstituteRequestCreateSerializer
        elif self.action in ['retrieve', 'update', 'partial_update', 'invitation_history']:
            return SubstituteRequestDetailSerializer
        return SubstituteRequestSerializer
    
    
    def get_queryset(self):
        user = self.request.user
        
        # Return nothing for unauthenticated users
        if not user.is_authenticated:
            return SubstituteRequest.objects.none()
        
        # School admins and principals see all requests for their school
        if user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            try:
                return SubstituteRequest.objects.filter(school=user.school)
            except AttributeError:
                return SubstituteRequest.objects.none()
        
        # For teachers, combine multiple conditions with OR
        elif user.user_type in ['EXTERNAL_TEACHER', 'INTERNAL_TEACHER']:
            from django.db.models import Q
            return SubstituteRequest.objects.filter(
                # Creator OR assigned
                Q(requested_by=user) | 
                Q(assigned_teacher=user)
            ).distinct()
        
        # Default case
        return SubstituteRequest.objects.none()
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_requests(self, request):
        """Returns requests created by the current user"""
        queryset = SubstituteRequest.objects.filter(requested_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def requests_to_me(self, request):
        """Returns requests where the current user was invited"""
        queryset = SubstituteRequest.objects.filter(
            invitations__teacher=request.user
        ).distinct()
        
        # Allow filtering by status
        status_param = request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(invitations__status=status_param)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def school_requests(self, request):
        """Returns all requests for the school (admin/principal only)"""
        user = request.user
        if user.user_type not in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            return Response(
                {"detail": "You don't have permission to access this resource."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            queryset = SubstituteRequest.objects.filter(school=user.school_staff.school)
            
            # Optional: Allow filtering by status
            req_status = request.query_params.get('status', None)
            if req_status:
                queryset = queryset.filter(status=req_status)
                
            # Optional: Allow filtering by date range
            start_date = request.query_params.get('start_date', None)
            end_date = request.query_params.get('end_date', None)
            if start_date and end_date:
                queryset = queryset.filter(date__range=[start_date, end_date])
                
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except AttributeError:
            return Response(
                {"detail": "School information not found."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def create(self, request, *args, **kwargs):
        """
        Create a new substitute request and directly match teachers
        """
        
        serializer = SubstituteRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        substitute_request = serializer.save()
        
        # Direct matching instead of using Celery
        try:
            # Get school algorithm settings
            settings = substitute_request.school.get_algorithm_settings
            if not isinstance(settings, dict):
                settings = {
                    'batch_size': 10, 
                    'wait_time_minutes': 10,
                    'weights': {'experience': 1, 'rating': 1, 'distance': 1}
                }
            
            # Get available teachers
            from .tasks import get_ranked_teachers
            ranked_teachers = get_ranked_teachers(substitute_request, settings)
            
            # Log matching results for debugging
            print(f"Found {ranked_teachers.count()} matching teachers for request {substitute_request.id}")
            
            # Process first batch of teachers
            from .tasks import process_teacher_batch
            if ranked_teachers.exists():
                process_teacher_batch(substitute_request, ranked_teachers[:settings['batch_size']], 1)
                substitute_request.status = 'AWAITING_ACCEPTANCE'
                substitute_request.save(update_fields=['status'])
                
            return Response({
                **serializer.data,
                'matching_teachers_count': ranked_teachers.count(),
                'detail': 'Request created and teachers matched successfully'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Log error but don't fail the request creation
            print(f"Error in teacher matching: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response({
                **serializer.data,
                'matching_error': str(e),
                'detail': 'Request created but teacher matching failed'
            }, status=status.HTTP_201_CREATED)
    
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
    
    @action(detail=True, methods=['post'], url_path='accept_request', url_name='accept_request', permission_classes=[IsAuthenticated])
    def accept_request(self, request, pk=None):
        """
        Teacher accepts a substitute request.
        """
        print("Accepting request")
        print(f"accept_request called with pk={pk}, user={request.user}")
        teacher = request.user
        substitute_request = get_object_or_404(SubstituteRequest, pk=pk)
        print(f"Substitute request: {substitute_request}")
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
            
            # --- FIX HERE: Combine date/time and make timezone-aware ---
            request_date = substitute_request.date
            start_datetime_naive = datetime.datetime.combine(request_date, substitute_request.start_time)
            end_datetime_naive = datetime.datetime.combine(request_date, substitute_request.end_time)

            # Make them timezone-aware using Django's current timezone
            start_datetime_aware = timezone.make_aware(start_datetime_naive)
            end_datetime_aware = timezone.make_aware(end_datetime_naive)

            # Create TeachingSession using get_or_create to prevent duplicates
            session, created = TeachingSession.objects.get_or_create(
                substitute_request=substitute_request,
                defaults={
                    'teacher': teacher,
                    'start_time': start_datetime_aware, # Use the aware datetime
                    'end_time': end_datetime_aware,   # Use the aware datetime
                    'status': 'SCHEDULED',
                    'mode': substitute_request.mode # Copy mode from request
                }
            )
            if created:
                print(f"--- Created TeachingSession {session.id} ---")
            else:
                print(f"--- Found existing TeachingSession {session.id} ---")
            # --- End Fix ---
            
            # Withdraw other pending invitations
            RequestInvitation.objects.filter(
                substitute_request=substitute_request,
                status='PENDING'
            ).exclude(id=invitation.id).update(status='WITHDRAWN', responded_at=timezone.now())
            
            # Send assignment notification
            # send_assignment_notifications.delay(substitute_request.id)
            
            return Response({"detail": "Request accepted successfully"})
        except RequestInvitation.DoesNotExist:
            return Response(
                {"detail": "No pending invitation found for this request"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def decline_request(self, request, pk=None):
        """Decline a substitute request invitation"""
        substitute_request = get_object_or_404(SubstituteRequest, pk=pk)
        teacher = request.user
        response_note = request.data.get('response_note', '')
 
        try:
            invitation = RequestInvitation.objects.get(
                substitute_request=substitute_request,
                teacher=teacher,
                status='PENDING'
            )
            invitation.status = 'DECLINED'
            invitation.response_note = response_note
            invitation.responded_at = timezone.now()
            invitation.save()
            return Response({'detail': 'You have declined the request.'}, status=status.HTTP_200_OK)
        except RequestInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found or already responded.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def invitation_history(self, request, pk=None):
        """
        Get detailed invitation history for a substitute request
        """
        instance = get_object_or_404(SubstituteRequest, pk=pk)
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
            

    
    @action(detail=False, methods=['get'])
    def requests_to_me(self, request):
        """
        Returns requests where the current user was invited
        """
        user = request.user
        queryset = SubstituteRequest.objects.filter(
            invitations__teacher=user
        ).distinct()
        
        # Optional: Allow filtering by status
        status = request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(invitations__status=status)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    
 
    