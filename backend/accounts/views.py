from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, smart_str, DjangoUnicodeDecodeError
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    TeacherProfileSerializer, StudentProfileSerializer,
    SchoolProfileSerializer, TeacherAvailabilitySerializer,
    ChangePasswordSerializer, UserPasswordResetSerializer,
    SendPasswordResetEmailSerializer, UserProfileUpdateSerializer, 
    ProfileVerificationSerializer, AlgorithmSettingsSerializer, 
    UserProfileSerializer
)
from .models import TeacherProfile, StudentProfile, School, TeacherAvailability
from .utils import send_email, success_msg, error, ProfileChangeLoggingMixin
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User, TeacherProfile, StudentProfile, School, SchoolStaff
from django.core.exceptions import ValidationError


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

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework import status
from .serializers import UserPasswordResetSerializer

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

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TeacherProfile.objects.none()
        if user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']:
            return TeacherProfile.objects.filter(user=user)
        elif user.user_type == 'SCHOOL_ADMIN':
            school = School.objects.get(user=user)
            return TeacherProfile.objects.filter(school=school)
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
    
    def get(self, request):
        return Response({
            "message": "Please complete your profile",
            "user_type": request.user.user_type
        })

class VerificationPendingView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "message": "Your profile is pending verification",
            "status": request.user.profile_verification_status
        })


class ProfileVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.user_type != 'SCHOOL_ADMIN':
            return Response({"error": "Only school admins can verify profiles"}, 
                          status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id)
            school = School.objects.get(user=request.user)

            # Verify if user belongs to admin's school
            if user.user_type in ['PRINCIPAL', 'INTERNAL_TEACHER', 'STUDENT']:
                if user.student_profile and user.student_profile.school != school:
                    return Response({"error": "User does not belong to your school"},
                                  status=status.HTTP_403_FORBIDDEN)
                if user.teacher_profile and user.teacher_profile.school != school:
                    return Response({"error": "User does not belong to your school"},
                                  status=status.HTTP_403_FORBIDDEN)

            serializer = ProfileVerificationSerializer(user, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

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

    def get(self, request):
        if request.user.user_type != 'SCHOOL_ADMIN':
            return Response(
                {"error": "Only school administrators can access algorithm settings"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            school = School.objects.get(user=request.user)
            return Response(school.get_algorithm_settings)
        except School.DoesNotExist:
            return Response(
                {"error": "School not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    def put(self, request):
        if request.user.user_type != 'SCHOOL_ADMIN':
            return Response(
                {"error": "Only school administrators can modify algorithm settings"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            school = School.objects.get(user=request.user)
            serializer = AlgorithmSettingsSerializer(data=request.data)
            
            if serializer.is_valid():
                school.matching_algorithm_settings = serializer.validated_data
                school.save()
                return Response(school.get_algorithm_settings)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except School.DoesNotExist:
            return Response(
                {"error": "School not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
            
from rest_framework import generics, status
from rest_framework.response import Response
from .permissions import CanManageSchoolProfile

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