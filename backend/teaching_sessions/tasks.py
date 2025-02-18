# tasks.py

from celery import shared_task
from django.utils import timezone
from .models import TeachingSession

@shared_task
def check_session_status():
    now = timezone.now()
    # Start sessions that are scheduled to start now
    sessions_to_start = TeachingSession.objects.filter(
        status='SCHEDULED',
        start_time__lte=now
    )
    for session in sessions_to_start:
        session.status = 'ONGOING'
        session.save()
    # End sessions that are ongoing and should be completed
    sessions_to_end = TeachingSession.objects.filter(
        status='ONGOING',
        end_time__lte=now
    )
    for session in sessions_to_end:
        session.status = 'COMPLETED'
        session.save()