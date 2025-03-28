from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, smart_str, DjangoUnicodeDecodeError
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from .models import TeacherProfile, StudentProfile, SchoolStaff, TeacherAvailability
from .utils import send_email
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TeacherProfile, StudentProfile, SchoolStaff, User, TeacherAvailability, School
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import exceptions
from django.utils import timezone

USER_TYPE_CHOICES = (
    ('SCHOOL_ADMIN', 'School Administrator'),
    ('PRINCIPAL', 'School Principal'),
    ('INTERNAL_TEACHER', 'Internal Teacher'),
    ('EXTERNAL_TEACHER', 'External Teacher'),
    ('STUDENT', 'Student'),
    ('PARENT', 'Parent'),
)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    user_type = serializers.ChoiceField(choices=USER_TYPE_CHOICES, write_only=True)
    phone_number = serializers.CharField(required=False)
    school_name = serializers.ChoiceField(choices=[], required=False)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'confirm_password', 'user_type', 'phone_number', 'school_name')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['school_name'].choices = [(school.id, school.school_name) for school in School.objects.all()]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError("Passwords do not match")
        if attrs['user_type'] != 'EXTERNAL_TEACHER' and not attrs.get('school_name'):
            raise serializers.ValidationError("School name is required for all user types except external teachers")
        return attrs

    def create(self, validated_data):
        school_id = validated_data.pop('school_name', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        user.phone_number = validated_data.get('phone_number', '')
        user.user_type = validated_data['user_type']

        # Set verification status based on user type
        if user.user_type == 'SCHOOL_ADMIN':
            user.profile_verification_status = 'VERIFIED'
            user.profile_completed = True
        else:
            user.profile_verification_status = 'PENDING'
            user.profile_completed = False
            
        user.save()

        if user.user_type != 'EXTERNAL_TEACHER' and school_id:
            school = School.objects.get(id=school_id)
            if user.user_type == 'SCHOOL_ADMIN':
                if SchoolStaff.objects.filter(school=school, role='ADMIN').exists():
                    raise serializers.ValidationError("This school already has an assigned school administrator.")
                SchoolStaff.objects.create(user=user, school=school, role='ADMIN')
            elif user.user_type == 'PRINCIPAL':
                if SchoolStaff.objects.filter(school=school, role='PRINCIPAL').exists():
                    raise serializers.ValidationError("This school already has an assigned principal.")
                SchoolStaff.objects.create(user=user, school=school, role='PRINCIPAL')
            elif user.user_type == 'INTERNAL_TEACHER':
                # Create both TeacherProfile and SchoolStaff entries
                TeacherProfile.objects.create(user=user, school=school, teacher_type='INTERNAL')
                SchoolStaff.objects.create(user=user, school=school, role='TEACHER')
            elif user.user_type == 'STUDENT':
                StudentProfile.objects.create(user=user, school=school)

        return user
    
class AlgorithmSettingsSerializer(serializers.Serializer):
    batch_size = serializers.IntegerField(min_value=1, max_value=50)
    wait_time_minutes = serializers.IntegerField(min_value=1, max_value=60)
    weights = serializers.DictField(
        child=serializers.DictField(
            child=serializers.FloatField(min_value=0.1, max_value=10.0)
        )
    )

    def validate_weights(self, value):
        required_keys = ['qualification', 'rating_multiplier', 'experience_multiplier']
        if not all(key in value for key in required_keys):
            raise serializers.ValidationError(f"Missing required weight categories: {required_keys}")
        return value


class ProfileVerificationSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = User
        fields = ['profile_verification_status', 'verification_notes']

    def validate(self, data):
        if not self.instance.profile_completed:
            raise serializers.ValidationError({"error": "Cannot verify an incomplete profile"})
                    
        if data.get('profile_verification_status') == 'REJECTED' and not data.get('verification_notes'):
            raise serializers.ValidationError({
                "verification_notes": "Verification notes are required when rejecting a profile"
            })
            
        return data

    def update(self, instance, validated_data):
        instance.profile_verification_status = validated_data['profile_verification_status']
        instance.verification_notes = validated_data.get('verification_notes', '')
        instance.save()
        return instance


class UserLoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except exceptions.AuthenticationFailed:
            raise serializers.ValidationError("Invalid credentials")

        user = self.user

        # if not user.is_active:
        #     raise serializers.ValidationError("User account is disabled.")
        
        # Add additional user data to response
        data.update({
            'user_id': str(user.id),
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'profile_completed': user.profile_completed,
            'profile_verification_status': user.profile_verification_status,
        })

        return data


class SendPasswordResetEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)

    def validate(self, attrs):
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            uid = urlsafe_base64_encode(force_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)
            link = f"http://127.0.0.1:8000/reset-password/{uid}_{token}/"
            subject = "Password Reset Requested"
            message = f"Set your new password by clicking on the below link. Thank You :)\n{link}"
            status = send_email(subject, message, email)
            if status == "0":
                raise serializers.ValidationError('Email sending failed. Please try again')
            return attrs
        else:
            raise serializers.ValidationError('You are not a registered user.')

class UserPasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=255, style={'input_type': 'password'}, write_only=True)
    confirm_password = serializers.CharField(max_length=255, style={'input_type': 'password'}, write_only=True)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        uid = self.context.get('uid')
        token = self.context.get('token')
        if password != confirm_password:
            raise serializers.ValidationError("Password and Confirm Password do not match")
        try:
            user_id = smart_str(urlsafe_base64_decode(uid))
            user = User.objects.get(id=user_id)
            if not PasswordResetTokenGenerator().check_token(user, token):
                raise serializers.ValidationError("Token is not valid or expired")
            user.set_password(password)
            user.save()
            return attrs
        except DjangoUnicodeDecodeError:
            raise serializers.ValidationError('Token is not valid or expired')

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError("Current password is incorrect")
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number']


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = TeacherProfile
        fields = '__all__'
        #exclude = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class SchoolProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        exclude = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        exclude = ['user']
        
class SchoolStaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolStaff
        exclude = ['user']
        
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAvailability
        exclude = ['teacher']
        

class UserProfileSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer( read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    school_staff_profile = SchoolStaffSerializer(read_only=True)
    school_profile = SchoolProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'user_type', 'phone_number', 'profile_image', 
            'created_at', 'updated_at', 'teacher_profile', 'student_profile', 
            'school_staff_profile', 'school_profile', 'profile_completed', 'profile_verification_status'
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        user_type = instance.user_type

        if user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            teacher_profile = instance.teacher_profile
            if user_type == 'INTERNAL_TEACHER':
                school_data = SchoolProfileSerializer(teacher_profile.school).data
                representation.update(school_data)
            representation.update(TeacherProfileSerializer(teacher_profile).data)
        
        elif user_type == 'STUDENT':
            student_profile = instance.student_profile
            representation.update(StudentProfileSerializer(student_profile).data)
        
        elif user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            admin_profile = instance.school_staff
            school_data = SchoolProfileSerializer(admin_profile.school).data
            representation.update(school_data)
            representation.update(SchoolStaffSerializer(admin_profile).data)
        
        return representation

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False, allow_null=True)
    school_profile = SchoolProfileSerializer(required=False, allow_null=True)
    student_profile = StudentProfileSerializer(required=False, allow_null=True)
    school_staff_profile = SchoolStaffSerializer(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'phone_number',
            'user_type',
            'profile_image',
            'teacher_profile',
            'school_profile',
            'student_profile'
            'school_staff_profile'
        ]
        read_only_fields = ['email', 'user_type']

    def update(self, instance, validated_data):
        # Handle nested profile updates
        teacher_profile_data = validated_data.pop('teacher_profile', None)
        school_profile_data = validated_data.pop('school_profile', None)
        student_profile_data = validated_data.pop('student_profile', None)
        school_staff_profile_data = validated_data.pop('school_staff_profile', None)

        # Update user data
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update teacher profile if exists
        if teacher_profile_data and hasattr(instance, 'teacher_profile'):
            for attr, value in teacher_profile_data.items():
                setattr(instance.teacher_profile, attr, value)
            instance.teacher_profile.save()

        # Update school profile if exists
        if school_profile_data and hasattr(instance, 'school_profile'):
            for attr, value in school_profile_data.items():
                setattr(instance.school_profile, attr, value)
            instance.school_profile.save()

        # Update student profile if exists
        if student_profile_data and hasattr(instance, 'student_profile'):
            for attr, value in student_profile_data.items():
                setattr(instance.student_profile, attr, value)
            instance.student_profile.save()
            
        # Update school staff profile if exists
        if school_staff_profile_data and hasattr(instance, 'school_staff_profile'):
            for attr, value in school_staff_profile_data.items():
                setattr(instance.school_staff_profile, attr, value)
            instance.school_staff_profile.save()

        return instance
    
class SchoolProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        exclude = ['user', 'created_at', 'updated_at']
        read_only_fields = ['id', 'verified', 'subscription_status']

    def validate(self, data):
        if 'established_year' in data:
            current_year = timezone.now().year
            if data['established_year'] > current_year:
                raise serializers.ValidationError({
                    "established_year": "Establishment year cannot be in the future"
                })
        return data


class ProfileCompletionSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)
    student_profile = StudentProfileSerializer(required=False)
    school_profile = SchoolProfileSerializer(required=False)
    school_staff_profile = SchoolStaffSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'first_name', 
            'last_name', 
            'phone_number',
            'profile_image',
            'teacher_profile',
            'student_profile',
            'school_profile',
            'school_staff_profile'
        ]

    def validate(self, data):
        user = self.context['request'].user
        
        if not data.get('first_name'):
            raise serializers.ValidationError("First name is required")
        if not data.get('last_name'):
            raise serializers.ValidationError("Last name is required")
        if not data.get('phone_number'):
            raise serializers.ValidationError("Phone number is required")

        # Validate based on user type
        if user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            if not data.get('teacher_profile'):
                raise serializers.ValidationError("Teacher profile details are required")
            teacher_data = data.get('teacher_profile')
            if not teacher_data.get('qualification'):
                raise serializers.ValidationError("Teacher qualification is required")
            if not teacher_data.get('subjects'):
                raise serializers.ValidationError("Teaching subjects are required")
            if not teacher_data.get('experience_years'):
                raise serializers.ValidationError("Teaching experience is required")

        elif user.user_type == 'STUDENT':
            if not data.get('student_profile'):
                raise serializers.ValidationError("Student profile details are required")
            student_data = data.get('student_profile')
            if not student_data.get('grade'):
                raise serializers.ValidationError("Grade is required")
            if not student_data.get('parent_name'):
                raise serializers.ValidationError("Parent name is required")
            if not student_data.get('parent_phone'):
                raise serializers.ValidationError("Parent phone is required")

        elif user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            if not data.get('school_staff_profile'):
                raise serializers.ValidationError("School staff profile details are required")

        return data

    def update(self, instance, validated_data):
        # Update basic user information
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.address = validated_data.get('address', instance.address)
        if validated_data.get('profile_image'):
            instance.profile_image = validated_data.get('profile_image')

        # Handle profile specific data
        if instance.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            teacher_data = validated_data.get('teacher_profile', {})
            teacher_profile, created = TeacherProfile.objects.get_or_create(user=instance)
            for attr, value in teacher_data.items():
                setattr(teacher_profile, attr, value)
            teacher_profile.save()

        elif instance.user_type == 'STUDENT':
            student_data = validated_data.get('student_profile', {})
            student_profile, created = StudentProfile.objects.get_or_create(user=instance)
            for attr, value in student_data.items():
                setattr(student_profile, attr, value)
            student_profile.save()

        elif instance.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            staff_data = validated_data.get('school_staff_profile', {})
            staff_profile, created = SchoolStaff.objects.get_or_create(user=instance)
            for attr, value in staff_data.items():
                setattr(staff_profile, attr, value)
            staff_profile.save()

        # Mark profile as completed
        instance.profile_completed = True
        instance.profile_verification_status = 'PENDING'
        instance.save()

        return instance