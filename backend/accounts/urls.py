from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'teacher-profiles', views.TeacherProfileViewSet, basename='teacher-profile')
router.register(r'student-profiles', views.StudentProfileViewSet, basename='student-profile')
router.register(r'school-profiles', views.SchoolProfileViewSet, basename='school-profile')
router.register(r'teacher-availability', views.TeacherAvailabilityViewSet, basename='teacher-availability')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.UserRegistrationView.as_view(), name='user-registration'),
    path('dashboard/', views.UserDashboardView.as_view(), name='user-dashboard'),
    path('profile/', views.user_profile, name='user-profile'),
    path('profile/completion/', views.ProfileCompletionView.as_view(), name='profile-completion'),
    path('profile/verification-pending/', views.VerificationPendingView.as_view(), name='verification-pending'),
    path('profile/verify/<uuid:user_id>/', views.ProfileVerificationView.as_view(), name='profile-verify'),
    path('profile/upload_image/', views.UploadProfileImageView.as_view(), name='upload-profile-image'),
    path('profile/<str:username>/', views.FetchUserProfileView.as_view(), name='fetch-user-profile'),
    path('profile/update-availability/', views.UpdateAvailabilityView.as_view(), name='update-teacher-availability'),
    path('school/algorithm-settings/', views.SchoolAlgorithmSettingsView.as_view(), name='school-algorithm-settings'),
    path('school/profile/', views.SchoolProfileView.as_view(), name='school-profile'),
    path('school/profile/<uuid:pk>/', views.SchoolProfileDetailView.as_view(), name='school-profile-detail'),
    path('change-password/', views.change_password, name='change-password'),
    path('available-teachers/', views.get_available_teachers, name='available-teachers'),
    path('request-reset-email/', views.request_reset_email, name='request-reset-email'),
    re_path(r"^reset-password/(?P<uid>[-\w]+)_(?P<token>[-\w]+)/", views.resetPassword, name="reset-password")
]