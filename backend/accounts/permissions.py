from rest_framework import permissions

class IsOwnerOrSchoolAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    School admins can view their school's related objects.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to school admin
        if request.method in permissions.SAFE_METHODS:
            if request.user.user_type == 'SCHOOL_ADMIN':
                if hasattr(obj, 'school'):
                    return obj.school == request.user.school_profile
                return False
            
        # Write permissions are only allowed to the owner
        return obj.user == request.user

class IsTeacher(permissions.BasePermission):
    """
    Custom permission to only allow teachers to access certain views
    """
    
    def has_permission(self, request, view):
        return request.user.user_type in ['INTERNAL_TEACHER', 'EXTERNAL_TEACHER']

    def has_object_permission(self, request, view, obj):
        # Teachers can only access their own profiles or related objects
        return obj.user == request.user

class IsStudent(permissions.BasePermission):
    """
    Custom permission to only allow students to access certain views
    """
    
    def has_permission(self, request, view):
        return request.user.user_type == 'STUDENT'

    def has_object_permission(self, request, view, obj):
        # Students can only access their own profiles or related objects
        return obj.user == request.user

class IsSchoolAdmin(permissions.BasePermission):
    """
    Custom permission to only allow school administrators to access certain views
    """
    
    def has_permission(self, request, view):
        return request.user.user_type == 'SCHOOL_ADMIN'

    def has_object_permission(self, request, view, obj):
        # School admins can access their school's related objects
        if hasattr(obj, 'school'):
            return obj.school == request.user.school_profile
        return False

class IsPrincipal(permissions.BasePermission):
    """
    Custom permission to only allow school principals to access certain views
    """
    
    def has_permission(self, request, view):
        return request.user.user_type == 'PRINCIPAL'

    def has_object_permission(self, request, view, obj):
        # Principals can access their school's related objects
        if hasattr(obj, 'school'):
            return obj.school == request.user.school_profile
        return False
    
class CanManageSchoolProfile(permissions.BasePermission):
    """
    Custom permission to only allow school admin and principal to edit school profile.
    """
    def has_permission(self, request, view):
        # Allow read-only access to authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Check if user is school admin or principal
        return request.user.is_authenticated and request.user.user_type in [
            'SCHOOL_ADMIN', 'PRINCIPAL'
        ]

    def has_object_permission(self, request, view, obj):
        # Allow read-only access to authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Check if user belongs to the school
        if hasattr(request.user, 'school_staff'):
            return (request.user.school_staff.school == obj and 
                   request.user.user_type in ['SCHOOL_ADMIN', 'PRINCIPAL'])
        return False