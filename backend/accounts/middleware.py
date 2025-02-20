from django.shortcuts import redirect
from django.urls import reverse
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse

class ProfileCompletionCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and not request.user.is_superuser:
            # Exclude certain paths
            excluded_paths = [
                reverse('profile-completion'),
                reverse('verification-pending'),
                '/admin/',
                '/api/auth/logout/',
                '/api/profile/complete/',
            ]

            if not any(request.path.startswith(path) for path in excluded_paths):
                if not request.user.profile_completed:
                    if self.is_api_request(request):
                        return JsonResponse(
                            {"error": "Please complete your profile"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    return redirect('profile-completion')

                if (request.user.profile_completed and 
                    request.user.profile_verification_status == 'PENDING'):
                    if self.is_api_request(request):
                        return JsonResponse(
                            {"error": "Your profile is pending verification"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    return redirect('verification-pending')

        response = self.get_response(request)
        return response

    def is_api_request(self, request):
        return (
            request.path.startswith('/api/') or 
            request.headers.get('accept') == 'application/json' or
            request.headers.get('content-type') == 'application/json'
        )