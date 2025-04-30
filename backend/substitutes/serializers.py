from rest_framework import serializers
from .models import SubstituteRequest, TeacherAvailability, RequestInvitation
from accounts.models import School, User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


from django.urls import reverse
from rest_framework import serializers

class TeacherInvitationSerializer(serializers.ModelSerializer):
    teacher_details = serializers.SerializerMethodField()
    teacher_profile_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RequestInvitation
        fields = ['id', 'status', 'invited_at', 'responded_at', 
                 'response_note', 'batch_number', 'teacher_details',
                 'teacher_profile_url']
    
    def get_teacher_profile_url(self, obj):
        """Generate profile URL for the teacher"""
        return reverse('fetch-user-profile', kwargs={'username': obj.teacher.username})
    
    def get_teacher_details(self, obj):
        return {
            'id': obj.teacher.id,
            'name': obj.teacher.get_full_name(),
            'email': obj.teacher.email,
            'experience': obj.teacher.teacher_profile.experience_years,
            'teaching_methodology': obj.teacher.teacher_profile.teaching_methodology,
            'qualifications': obj.teacher.teacher_profile.qualification,
            'subjects': obj.teacher.teacher_profile.subjects,
            'rating': obj.teacher.teacher_profile.rating,
            'availability_status': obj.teacher.teacher_profile.availability_status,
            'travel_radius': obj.teacher.teacher_profile.travel_radius,
            'can_teach_online': obj.teacher.teacher_profile.can_teach_online,
            'can_travel': obj.teacher.teacher_profile.can_travel,
            'hourly_rate': obj.teacher.teacher_profile.hourly_rate,
            'preferred_classes': obj.teacher.teacher_profile.preferred_classes,
            'preferred_boards': obj.teacher.teacher_profile.preferred_boards,
            'document_verification_status': obj.teacher.teacher_profile.document_verification_status,
            'languages': obj.teacher.teacher_profile.languages,
            'address': obj.teacher.teacher_profile.address,
            'city': obj.teacher.teacher_profile.city,
            'state': obj.teacher.teacher_profile.state,
            'country': obj.teacher.teacher_profile.country,
            'postal_code': obj.teacher.teacher_profile.postal_code,
            'date_of_birth': obj.teacher.teacher_profile.date_of_birth
        }

class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for Teacher Availability"""
    teacher_name = serializers.CharField(
        source='teacher.get_full_name', 
        read_only=True
    )
    teacher_email = serializers.EmailField(
        source='teacher.email', 
        read_only=True
    )

    class Meta:
        model = TeacherAvailability
        fields = [
            'id', 
            'teacher', 
            'teacher_name',
            'teacher_email',
            'date', 
            'start_time', 
            'end_time', 
            'is_recurring', 
            'recurrence_pattern', 
            'status', 
            'preferred_subjects',
            'duration'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']



class SubstituteRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for Creating Substitute Requests"""
    class Meta:
        model = SubstituteRequest
        fields = [
            'id',
            'school',
            'requested_by',
            'subject',
            'grade',
            'section',
            'date',
            'start_time',
            'end_time',
            'priority',
            'mode',
            'description',
            'requirements',
            'special_instructions'
        ]
        read_only_fields = ['id', 'school', 'requested_by', 'created_at', 'updated_at']        
    def create(self, validated_data):
        user = self.context['request'].user
        
        # Get school based on user type
        if user.user_type in ['SCHOOL_ADMIN', 'INTERNAL_TEACHER', 'PRINCIPAL']:
            school = user.school_staff.school
        else:
            raise serializers.ValidationError("Only school admins, principals and internal teachers can create substitute requests")
            
        validated_data['school'] = school
        validated_data['requested_by'] = user

    
        # After saving the request
        # channel_layer = get_channel_layer()
        # async_to_sync(channel_layer.group_send)(
        #     "teachers",
        #     {
        #         "type": "new_request",
        #         "request": {
        #             "id": validated_data['id'],
        #             "grade": validated_data['grade'],
        #             "section": validated_data['section'],
        #             "subject": validated_data['subject'],
        #             "school": school.name,
        #             "date": validated_data['date'],
        #             "time": f"{validated_data['start_time']} - {validated_data['end_time']}",
        #             "Created_at" : validated_data['created_at'],
        #         }
        #     }
        # )
        
        return super().create(validated_data)



class SubstituteRequestDetailSerializer(serializers.ModelSerializer):
    """Detailed Serializer for Substitute Requests"""
    assigned_teacher_details = serializers.SerializerMethodField()
    matching_teachers = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    invitations = TeacherInvitationSerializer(many=True, read_only=True)

    
    class Meta:
        model = SubstituteRequest
        fields = '__all__'

        read_only_fields = [
            'id', 
            'created_at', 
            'updated_at', 
            'meeting_link',
            'host_link',
            'matching_teachers'
        ]

    def get_assigned_teacher_details(self, obj):
        """Get details of assigned teacher"""
        if obj.assigned_teacher:
            return {
                'id': obj.assigned_teacher.id,
                'name': obj.assigned_teacher.get_full_name(),
                'email': obj.assigned_teacher.email
            }
        return None

    def get_matching_teachers(self, obj):
        """Get list of potential matching teachers"""
        matching_teachers = obj.get_matching_teachers()
        return TeacherAvailabilitySerializer(matching_teachers, many=True).data
    
    def get_current_status(self, obj):
        return {
            'total_invites': obj.invitations.count(),
            'pending': obj.invitations.filter(status='PENDING').count(),
            'accepted': obj.invitations.filter(status='ACCEPTED').count(),
            'declined': obj.invitations.filter(status='DECLINED').count(),
            'withdrawn': obj.invitations.filter(status='WITHDRAWN').count(),
            'expired': obj.invitations.filter(status='EXPIRED').count(),
        }

class SubstituteRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for Substitute Requests
    """
    class Meta:
        model = SubstituteRequest
        fields = '__all__'
        
# Add notification serializer
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'content', 'notification_type', 'is_read', 'timestamp']