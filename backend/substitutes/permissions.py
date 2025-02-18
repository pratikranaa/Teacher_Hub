# substitutes/permissions.py

from rest_framework import permissions

class CanCreateSubstituteRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action != 'create':
            return True
            
        return request.user.user_type in ['SCHOOL_ADMIN', 'INTERNAL_TEACHER']