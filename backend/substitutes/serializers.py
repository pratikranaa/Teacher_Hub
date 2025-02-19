from rest_framework import serializers
from .models import SubstituteRequest, TeacherAvailability
from accounts.models import School
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
        read_only_fields = ['id','school', 'created_at', 'updated_at']
        
    def create(self, validated_data):
        user = self.context['request'].user
        
        # Get school based on user type
        if user.user_type == 'SCHOOL_ADMIN' or 'INTERNAL_TEACHER':
            school = School.objects.get(user=user)
        else:
            raise serializers.ValidationError("Only school admins and internal teachers can create substitute requests")
            
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
    
    class Meta:
        model = SubstituteRequest
        fields = [
            'id',
            'school',
            'requested_by',
            'original_teacher',
            'assigned_teacher',
            'assigned_teacher_details',
            'subject',
            'grade',
            'date',
            'start_time',
            'end_time',
            'status',
            'priority',
            'mode',
            'description',
            'requirements',
            'special_instructions',
            'meeting_link',
            'cancellation_reason',
            'matching_teachers',
            'created_at',
            'updated_at',
            'duration'
        ]
        read_only_fields = [
            'id', 
            'created_at', 
            'updated_at', 
            'meeting_link',
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


from rest_framework import serializers
from .models import SubstituteRequest

class SubstituteRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for Substitute Requests
    """
    class Meta:
        model = SubstituteRequest
        fields = '__all__'