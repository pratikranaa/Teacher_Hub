from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, smart_str, DjangoUnicodeDecodeError
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework import status
from .serializers import UserPasswordResetSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import viewsets, permissions, status, generics, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from rest_framework import generics, status
from rest_framework.response import Response
from .permissions import CanManageSchoolProfile
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    TeacherProfileSerializer, StudentProfileSerializer,
    SchoolProfileSerializer, TeacherAvailabilitySerializer,
    ChangePasswordSerializer, UserPasswordResetSerializer,
    SendPasswordResetEmailSerializer, UserProfileUpdateSerializer, 
    ProfileVerificationSerializer, AlgorithmSettingsSerializer, 
    UserProfileSerializer, ProfileCompletionSerializer, SchoolStaffSerializer
)
from .models import TeacherProfile, StudentProfile, School, TeacherAvailability
from .utils import send_email, success_msg, error, ProfileChangeLoggingMixin
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User, TeacherProfile, StudentProfile, School, SchoolStaff
from django.core.exceptions import ValidationError
from django.db import models
import datetime


User = get_user_model()

class UserLoginView(TokenObtainPairView):
    serializer_class = UserLoginSerializer

    def get_serializer_context(self):
        return {'request': self.request}

@csrf_exempt
def request_reset_email(request):
    if request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = SendPasswordResetEmailSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            msg = "Password Reset link sent. Please check your email."
            response = {'status': 'success', 'code': status.HTTP_200_OK, 'message': msg}
            return JsonResponse(response, status=201)
        return JsonResponse(serializer.errors, status=400)



@csrf_exempt
def resetPassword(request, uid, token):
    if request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = UserPasswordResetSerializer(data=data, context={'uid': uid, 'token': token})
        if serializer.is_valid(raise_exception=True):
            msg = "Password Reset successfully"
            response = {'status': 'success', 'code': status.HTTP_200_OK, 'message': msg}
            return JsonResponse(response, status=201)
        return JsonResponse(serializer.errors, status=400)

class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'status': 'success',
                'message': 'User registered successfully',
                'user_id': str(user.id)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TeacherProfileViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAuthenticated]


    def get_school(self, user):
        """Helper method to get school for a user"""
        try:
            # If user is principal or staff, get through school_staff
            if hasattr(user, 'school_staff'):
                return user.school_staff.school
            
            return None
        except (School.DoesNotExist, AttributeError):
            return None

    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TeacherProfile.objects.none()
        if user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            return TeacherProfile.objects.filter(user=user).select_related('user')
        elif user.user_type == 'SCHOOL_ADMIN':
            school = self.get_school(user)
            return TeacherProfile.objects.filter(school=school).select_related('user')
        return TeacherProfile.objects.none()


class StudentProfileViewSet(viewsets.ModelViewSet):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return StudentProfile.objects.none()
        if self.request.user.user_type == 'STUDENT':
            return StudentProfile.objects.filter(user=self.request.user)
        elif self.request.user.user_type == 'SCHOOL_ADMIN':
            school = School.objects.get(user=self.request.user)
            return StudentProfile.objects.filter(school=school)
        return StudentProfile.objects.none()

class SchoolProfileViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolProfileSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return School.objects.none()
        if self.request.user.user_type == 'SCHOOL_ADMIN':
            return School.objects.filter(user=self.request.user)
        return School.objects.none()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(success_msg('Password changed successfully'))
    return Response(error(serializer.errors))



class ProfileCompletionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get(self, request):
        """Get the current profile completion state and required fields"""
        user = request.user
        profile_data = {
            "message": "Please complete your profile",
            "user_type": user.user_type,
            "required_fields": self._get_required_fields(user.user_type),
            "form_schema": self._get_form_schema(user.user_type),
            "current_data": ProfileCompletionSerializer(user).data
        }
        return Response(profile_data)

    def _get_form_schema(self, user_type):
        """Generate dynamic form schema based on user type"""
        base_fields = {
            "first_name": {
                "type": "text",
                "label": "First Name",
                "required": True,
                "order": 1
            },
            "last_name": {
                "type": "text", 
                "label": "Last Name",
                "required": True,
                "order": 2
            },
            "phone_number": {
                "type": "text",
                "label": "Phone Number",
                "required": True,
                "order": 3
            },
            "profile_image": {
                "type": "file",
                "label": "Profile Image",
                "required": False,
                "accept": "image/*",
                "max_size": 204800,  # 200KB
                "order": 5
            }
        }
        
        # Teacher specific fields
        if user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            teacher_fields = {
                "teacher_profile.qualification": {
                    "type": "text",
                    "label": "Educational Qualification",
                    "required": True,
                    "order": 10
                },
                "teacher_profile.subjects": {
                    "type": "multi-text",
                    "label": "Teaching Subjects",
                    "required": True, 
                    "order": 11
                },
                "teacher_profile.experience_years": {
                    "type": "number",
                    "label": "Years of Experience",
                    "required": True,
                    "min": 0,
                    "order": 12
                },
                "teacher_profile.preferred_classes": {
                    "type": "multi-text",
                    "label": "Preferred Classes",
                    "required": False,
                    "order": 13
                },
                "teacher_profile.teaching_methodology": {
                    "type": "textarea",
                    "label": "Teaching Methodology",
                    "required": False,
                    "order": 14
                },
                "teacher_profile.languages": {
                    "type": "multi-text",
                    "label": "Languages Known",
                    "required": False,
                    "order": 15
                },
                "teacher_profile.can_teach_online": {
                    "type": "checkbox",
                    "label": "Available for Online Teaching",
                    "required": False,
                    "order": 16
                },
                "teacher_profile.can_travel": {
                    "type": "checkbox",
                    "label": "Available for Travel",
                    "required": False,
                    "order": 17
                }
            }
            return {**base_fields, **teacher_fields}
        
        # Student specific fields
        elif user_type == 'STUDENT':
            student_fields = {
                "student_profile.grade": {
                    "type": "text",
                    "label": "Current Grade",
                    "required": True,
                    "order": 10
                },
                "student_profile.section": {
                    "type": "text",
                    "label": "Section",
                    "required": False,
                    "order": 11
                },
                "student_profile.roll_number": {
                    "type": "text",
                    "label": "Roll Number",
                    "required": False,
                    "order": 12
                },
                "student_profile.parent_name": {
                    "type": "text",
                    "label": "Parent/Guardian Name",
                    "required": True,
                    "order": 13
                },
                "student_profile.parent_phone": {
                    "type": "text",
                    "label": "Parent/Guardian Phone",
                    "required": True,
                    "order": 14
                },
                "student_profile.parent_email": {
                    "type": "email",
                    "label": "Parent/Guardian Email",
                    "required": False,
                    "order": 15
                },
                "student_profile.date_of_birth": {
                    "type": "date",
                    "label": "Date of Birth",
                    "required": False,
                    "order": 16
                }
            }
            return {**base_fields, **student_fields}
        
        # School admin/principal specific fields
        elif user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            # Staff fields
            staff_fields = {
                "school_staff_profile.department": {
                    "type": "text",
                    "label": "Department",
                    "required": True,
                    "section": "Staff Details",
                    "order": 10
                },
                "school_staff_profile.employee_id": {
                    "type": "text",
                    "label": "Employee ID",
                    "required": True,
                    "section": "Staff Details",
                    "order": 11
                },
                "school_staff_profile.date_of_joining": {
                    "type": "date",
                    "label": "Date of Joining",
                    "required": True,
                    "section": "Staff Details",
                    "order": 12
                }
            }
            
            # School fields
            school_fields = {
                "school_profile.school_name": {
                    "type": "text",
                    "label": "School Name",
                    "required": True,
                    "section": "School Details",
                    "order": 20
                },
                "school_profile.category": {
                    "type": "select",
                    "label": "School Category",
                    "required": True,
                    "options": [
                        {"value": "PRIMARY", "label": "Primary School"},
                        {"value": "MIDDLE", "label": "Middle School"},
                        {"value": "SECONDARY", "label": "Secondary School"},
                        {"value": "HIGHER_SECONDARY", "label": "Higher Secondary School"},
                        {"value": "DEGREE_COLLEGE", "label": "Degree College"},
                        {"value": "UNIVERSITY", "label": "University"},
                        {"value": "OTHER", "label": "Other"}
                    ],
                    "section": "School Details",
                    "order": 21
                },
                "school_profile.address": {
                    "type": "textarea",
                    "label": "School Address",
                    "required": True,
                    "section": "School Details",
                    "order": 22
                },
                "school_profile.city": {
                    "type": "text",
                    "label": "City",
                    "required": True,
                    "section": "School Details",
                    "order": 23
                },
                "school_profile.state": {
                    "type": "text",
                    "label": "State",
                    "required": True,
                    "section": "School Details",
                    "order": 24
                },
                "school_profile.country": {
                    "type": "text",
                    "label": "Country",
                    "required": True,
                    "section": "School Details",
                    "order": 25
                },
                "school_profile.postal_code": {
                    "type": "text",
                    "label": "Postal Code",
                    "required": True,
                    "section": "School Details",
                    "order": 26
                },
                "school_profile.board_type": {
                    "type": "select",
                    "label": "Board Type",
                    "required": True,
                    "options": [
                        {"value": "CBSE", "label": "CBSE"},
                        {"value": "ICSE", "label": "ICSE"},
                        {"value": "IB", "label": "IB"},
                        {"value": "STATE", "label": "State Board"},
                        {"value": "OTHER", "label": "Other Board"}
                    ],
                    "section": "School Details",
                    "order": 27
                },
                "school_profile.registration_number": {
                    "type": "text",
                    "label": "Registration Number",
                    "required": True,
                    "section": "School Details",
                    "order": 28
                },
                "school_profile.established_year": {
                    "type": "number",
                    "label": "Established Year",
                    "required": True,
                    "min": 1800,
                    "max": datetime.datetime.now().year,
                    "section": "School Details",
                    "order": 29
                },
                "school_profile.website": {
                    "type": "url",
                    "label": "Website",
                    "required": False,
                    "section": "School Details",
                    "order": 30
                },
                "school_profile.contact_person": {
                    "type": "text",
                    "label": "Contact Person",
                    "required": True,
                    "section": "School Details",
                    "order": 31
                }
            }
            return {**base_fields, **staff_fields, **school_fields}
            
        return base_fields

    def post(self, request):
        """Handle profile completion submission"""
        serializer = ProfileCompletionSerializer(
            request.user,
            data=request.data,
            context={'request': request},
            partial=True
        )
        
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Profile completed successfully",
                "data": serializer.data,
                "verification_status": user.profile_verification_status
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _get_required_fields(self, user_type):
        """Helper method to return required fields based on user type"""
        base_fields = {
            "first_name": "First Name",
            "last_name": "Last Name",
            "phone_number": "Phone Number",
        }

        if user_type == 'INTERNAL_TEACHER':
            return {
                **base_fields,
                "teacher_profile": {
                    "qualification": "Educational Qualification",
                    "subjects": "Teaching Subjects",
                    "experience_years": "Years of Experience",
                    "preferred_classes": "Preferred Classes",
                    "languages": "Languages Known",
                    "can_teach_online": "Available for Online Teaching",
                    "can_travel": "Available for Travel",
                    "school_name": "School", # For internal teachers
                }
            }
        elif user_type == 'EXTERNAL_TEACHER':
            return {
                **base_fields,
                    "qualification": "Educational Qualification",
                    "subjects": "Teaching Subjects",
                    "experience_years": "Years of Experience",
                    "preferred_classes": "Preferred Classes",
                    "languages": "Languages Known",
                    "can_teach_online": "Available for Online Teaching",
                    "can_travel": "Available for Travel",
            }
        elif user_type == 'STUDENT':
            return {
                **base_fields,
                "student_profile": {
                    "grade": "Current Grade",
                    "section": "Section",
                    "roll_number": "Roll Number",
                    "parent_name": "Parent/Guardian Name",
                    "parent_phone": "Parent/Guardian Phone",
                    "parent_email": "Parent/Guardian Email",
                    "date_of_birth": "Date of Birth"
                }
            }
        elif user_type in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            return {
                **base_fields,
                "school_staff_profile": {
                    "employee_id": "Employee ID",
                    "designation": "Designation",
                },
                "school_profile": {
                    "school_name": "School Name",
                    "category": "School Category",
                    "board_type": "Board Type",       
            }        
            } 
        return base_fields

class VerificationPendingView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "message": "Your profile is pending verification",
            "status": request.user.profile_verification_status
        })


class ProfileVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get_school(self, user):
        """Helper method to get school for a user"""
        try:
            
            # If user is principal or staff, get through school_staff
            if hasattr(user, 'school_staff'):
                return user.school_staff.school
            
            return None
        except (School.DoesNotExist, AttributeError):
            return None

    def get(self, request):
        """Get list of pending profiles for verification"""
        if request.user.user_type not in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            return Response(
                {"error": "Only school admin and verified principals can view pending verifications"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the school
        school = self.get_school(request.user)
        if not school:
            return Response(
                {"error": "No school associated with your account"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Get pending profiles from the school
        pending_profiles = User.objects.filter(
            profile_completed=True,
            profile_verification_status='PENDING'
        ).filter(
            models.Q(teacher_profile__school=school) |
            models.Q(student_profile__school=school) |
            models.Q(school_staff__school=school)
        ).exclude(
            user_type__in=['SCHOOL_ADMIN', 'EXTERNAL_TEACHER']
        ).distinct()

        serializer = UserProfileSerializer(pending_profiles, many=True)
        return Response(serializer.data)

    def post(self, request, username):
        """Handle profile verification"""
        # Check if user is authorized to verify profiles
        if request.user.user_type not in ['SCHOOL_ADMIN', 'PRINCIPAL']:
            return Response(
                {"error": "Only school admin and principals can verify profiles"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # For principals, check their own verification status
        if request.user.user_type == 'PRINCIPAL' and request.user.profile_verification_status != 'VERIFIED':
            return Response(
                {"error": "Your profile needs to be verified first"}, 
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Get the user to be verified
            user_to_verify = User.objects.get(username=username)
            school = self.get_school(request.user)
            
            if not school:
                return Response(
                    {"error": "No school associated with your account"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify if user belongs to admin's/principal's school
            belongs_to_school = False
            if hasattr(user_to_verify, 'student_profile'):
                belongs_to_school = user_to_verify.student_profile.school == school
            elif hasattr(user_to_verify, 'teacher_profile'):
                belongs_to_school = user_to_verify.teacher_profile.school == school
            elif hasattr(user_to_verify, 'school_staff'):
                belongs_to_school = user_to_verify.school_staff.school == school

            if not belongs_to_school and user_to_verify.user_type != 'EXTERNAL_TEACHER':
                return Response(
                    {"error": "User does not belong to your school"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update verification status
            user_to_verify.profile_verification_status = 'VERIFIED'
            user_to_verify.verification_notes = request.data.get('notes', '')
            user_to_verify.save()

            return Response({
                "message": "Profile verified successfully",
                "status": user_to_verify.profile_verification_status,
                "notes": user_to_verify.verification_notes
            })

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class UserDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'user_id': str(user.id),
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
        }

        if user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            teacher_profile = get_object_or_404(TeacherProfile, user=user)
            data.update({
                'qualification': teacher_profile.qualification,
                'subjects': teacher_profile.subjects,
                'availability_status': teacher_profile.availability_status,
                'rating': str(teacher_profile.rating),
                'total_sessions': teacher_profile.total_sessions
            })
        elif user.user_type == 'STUDENT':
            student_profile = get_object_or_404(StudentProfile, user=user)
            data.update({
                'grade': student_profile.grade,
                'section': student_profile.section,
                'school': student_profile.school.school_name
            })
        elif user.user_type == 'SCHOOL_ADMIN':
            school = get_object_or_404(School, user=user)
            data.update({
                'school_name': school.school_name,
                'category': school.category,
                'board_type': school.board_type,
                'subscription_status': school.subscription_status
            })

        return Response(data)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    if request.method == 'GET':
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'status': 'success',
                'message': 'Profile updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        user.delete()
        return Response({"message": "Profile and all associated data deleted successfully"}, status=status.HTTP_200_OK)

class FetchUserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username, *args, **kwargs):
        user = get_object_or_404(User, username=username)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FetchUserProfileByIdView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id, *args, **kwargs):
        try:
            user = User.objects.get(id=user_id)
            serializer = UserProfileSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_teachers(request):
    subject = request.query_params.get('subject')
    date = request.query_params.get('date')
    time = request.query_params.get('time')
    board = request.query_params.get('board')

    teachers = TeacherProfile.objects.filter(
        availability_status='AVAILABLE',
        subjects__contains=[subject]
    )

    if board:
        teachers = teachers.filter(preferred_boards__contains=[board])

    if date and time:
        teachers = teachers.filter(
            availabilities__date=date,
            availabilities__start_time__lte=time,
            availabilities__end_time__gte=time
        )

    serializer = TeacherProfileSerializer(teachers, many=True)
    return Response(serializer.data)

class UserProfileUpdateView(generics.UpdateAPIView):
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
    


class UploadProfileImageView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        file = request.FILES.get('profile_image')

        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        user.profile_image = file
        user.save()

        return Response({"message": "Profile image uploaded successfully"}, status=status.HTTP_200_OK)
    


class TeacherAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TeacherAvailability.objects.none()
        if user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            return TeacherAvailability.objects.filter(teacher=user)
        return TeacherAvailability.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.user_type not in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            raise ValidationError('Only internal or external teachers can create availability records.')
        serializer.save(teacher=user)


class UpdateAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        user = request.user
        if user.user_type not in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            return Response({"error": "Only teachers can update availability information."}, status=status.HTTP_403_FORBIDDEN)

        teacher_profile = user.teacher_profile
        availability_data = request.data.get('availability')

        if not availability_data:
            return Response({"error": "No availability data provided."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TeacherProfileSerializer(teacher_profile, data={'availability_status': availability_data}, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Availability updated successfully", "data": serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class SchoolAlgorithmSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_school(self, user):
        """Helper method to get school for a user"""
        try:
            # Try direct school association first (for school admin)
            if user.user_type == 'SCHOOL_ADMIN':
                school = School.objects.filter(user=user).first()
                if school:
                    return school
            
            # If user is principal or staff, get through school_staff
            if hasattr(user, 'school_staff'):
                return user.school_staff.school
            
            return None
        except (School.DoesNotExist, AttributeError):
            return None

    def get(self, request):
        if request.user.user_type != 'SCHOOL_ADMIN':
            return Response(
                {"error": "Only school administrators can access algorithm settings"},
                status=status.HTTP_403_FORBIDDEN
            )

        school = self.get_school(request.user)
        if not school:
            return Response(
                {"error": "School not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Fixed: Access get_algorithm_settings as a property, not a function
        return Response(school.get_algorithm_settings)

    def put(self, request):
        if request.user.user_type != 'SCHOOL_ADMIN':
            return Response(
                {"error": "Only school administrators can modify algorithm settings"},
                status=status.HTTP_403_FORBIDDEN
            )

        school = self.get_school(request.user)
        if not school:
            return Response(
                {"error": "School not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        serializer = AlgorithmSettingsSerializer(data=request.data)
        
        if serializer.is_valid():
            school.matching_algorithm_settings = serializer.validated_data
            school.save()
            # Fixed: Access get_algorithm_settings as a property, not a function
            return Response(school.get_algorithm_settings)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            


class SchoolProfileView(ProfileChangeLoggingMixin, generics.RetrieveUpdateAPIView):
    serializer_class = SchoolProfileSerializer
    permission_classes = [CanManageSchoolProfile]
    
    def get_object(self):
        if hasattr(self.request.user, 'school_staff'):
            return self.request.user.school_staff.school
        elif hasattr(self.request.user, 'school_profile'):
            return self.request.user.school_profile
        return None
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        if not instance:
            return Response(
                {"error": "School not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

class SchoolProfileDetailView(generics.RetrieveAPIView):
    """View for retrieving school details by ID"""
    serializer_class = SchoolProfileSerializer
    queryset = School.objects.all()
    permission_classes = [permissions.IsAuthenticated]

