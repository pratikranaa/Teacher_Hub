from django.contrib import admin
from .models import TeachingSession, SessionRecording, SessionReport

admin.site.register(TeachingSession)
admin.site.register(SessionRecording)
admin.site.register(SessionReport)