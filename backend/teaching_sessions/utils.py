# teaching_sessions/services.py

import requests
import json
import time
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import SessionRecording
from substitutes.utils import token_generator_jiomeet  # Import the existing token generator

logger = logging.getLogger(__name__)

def create_jiomeet_jwt():
    """
    Create JWT token for JioMeet API authentication using the existing token generator
    """
    try:
        return token_generator_jiomeet()
    except Exception as e:
        logger.error(f"Error creating JioMeet JWT: {str(e)}")
        return None

def start_recording(session):
    """
    Start recording for a teaching session using JioMeet API
    Only start if 15 minutes have passed since the session started
    """
    try:
        # Check if we already have a recording for this session
        existing_recording = SessionRecording.objects.filter(session=session).first()
        if existing_recording and existing_recording.status != 'FAILED':
            logger.info(f"Recording already exists for session {session.id}")
            return existing_recording
            
        # Get JioMeet meeting details from the session
        jiomeet_id = getattr(session.substitute_request, 'jiomeet_id', None)
        room_pin = getattr(session.substitute_request, 'room_pin', None)
        
        if not (jiomeet_id and room_pin):
            logger.error(f"Missing JioMeet details for session {session.id}")
            return None
        
        # Check if 15 minutes have passed since the session started or substitute request start time
        current_time = timezone.now()
        session_start_time = session.start_time
        sub_request_start_time = getattr(session.substitute_request, 'start_time', None)
        
        reference_time = session_start_time
        if sub_request_start_time and sub_request_start_time > session_start_time:
            reference_time = sub_request_start_time
            
        if current_time < (reference_time + timedelta(minutes=15)):
            logger.info(f"Not starting recording yet for session {session.id}. Waiting for 15 minutes after start time.")
            return None
            
        # Create JWT token
        jwt_token = create_jiomeet_jwt()
        if not jwt_token:
            return None
            
        # Call JioMeet API to start recording
        response = requests.post(
            "https://jiomeetpro.jio.com/api/platform/v1/recordings/start",
            headers={
                "Content-Type": "application/json",
                "Authorization": jwt_token
            },
            data=json.dumps({
                "jiomeetId": jiomeet_id,
                "roomPIN": room_pin
            })
        )
        
        if response.status_code == 200:
            data = response.json()
            history_id = data.get('historyId')
            status = data.get('status')
            
            if history_id:
                # Create or update SessionRecording instance
                recording, created = SessionRecording.objects.update_or_create(
                    session=session,
                    defaults={
                        'jiomeet_id': jiomeet_id,
                        'room_pin': room_pin,
                        'history_id': history_id,
                        'status': 'STARTED'
                    }
                )
                logger.info(f"Recording started for session {session.id}: {history_id}")
                return recording
        
        logger.error(f"Failed to start recording: {response.text}")
        return None
    except Exception as e:
        logger.error(f"Error starting recording: {str(e)}")
        return None

def fetch_recording_url(session):
    """
    Fetch the recording URL from JioMeet API
    """
    try:
        # Get existing recording
        recording = SessionRecording.objects.filter(session=session).first()
        if not recording:
            logger.error(f"No recording found for session {session.id}")
            return None
        
        # If history ID is missing, we can't fetch the recording
        if not recording.history_id:
            logger.error(f"No history ID available for recording of session {session.id}")
            return None
            
        # Fetch recording URL using the list API
        jwt_token = create_jiomeet_jwt()
        if not jwt_token:
            return None
            
        response = requests.post(
            "https://jiomeetpro.jio.com/api/platform/v1/recordings/list",
            headers={
                "Content-Type": "application/json",
                "Authorization": jwt_token
            },
            data=json.dumps({
                "jiomeetId": recording.jiomeet_id,
                "roomPIN": recording.room_pin,
                "historyId": recording.history_id
            })
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('callRecordings') and len(data['callRecordings']) > 0:
                # Get the first recording URL
                recording_url = data['callRecordings'][0].get('url')
                
                if recording_url:
                    recording.recording_url = recording_url
                    recording.status = 'COMPLETED'
                    # If we have recording metadata, save it
                    recording_data = data['callRecordings'][0]
                    if 'duration' in recording_data:
                        try:
                            duration_seconds = int(recording_data['duration'])
                            recording.duration = timedelta(seconds=duration_seconds)
                        except (ValueError, TypeError):
                            pass
                    
                    if 'size' in recording_data:
                        try:
                            recording.size = int(recording_data['size'])
                        except (ValueError, TypeError):
                            pass
                    
                    recording.save()
                    logger.info(f"Recording URL fetched for session {session.id}: {recording_url}")
                    return recording_url
        
        logger.warning(f"Failed to fetch recording URL: {response.text}")
        return None
    except Exception as e:
        logger.error(f"Error fetching recording URL: {str(e)}")
        return None

def stop_recording(session):
    """
    This function is kept for backward compatibility.
    It now just calls fetch_recording_url.
    """
    return fetch_recording_url(session)

def get_recording_status(session):
    """
    Check the status of a recording
    """
    try:
        recording = SessionRecording.objects.filter(session=session).first()
        if not recording:
            return None
            
        # If we already have a URL, mark as completed
        if recording.recording_url:
            recording.status = 'COMPLETED'
            recording.save()
            return 'COMPLETED'
            
        # Check status with JioMeet API
        jwt_token = create_jiomeet_jwt()
        if not jwt_token:
            return None
            
        response = requests.post(
            "https://jiomeetpro.jio.com/api/platform/v1/recordings/list",
            headers={
                "Content-Type": "application/json",
                "Authorization": jwt_token
            },
            data=json.dumps({
                "jiomeetId": recording.jiomeet_id,
                "roomPIN": recording.room_pin,
                "historyId": recording.history_id
            })
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('callRecordings') and len(data['callRecordings']) > 0:
                recording.status = 'COMPLETED'
                # Update URL if available
                recording_url = data['callRecordings'][0].get('url')
                if recording_url:
                    recording.recording_url = recording_url
                    
                    # If we have recording metadata, save it
                    recording_data = data['callRecordings'][0]
                    if 'duration' in recording_data:
                        try:
                            duration_seconds = int(recording_data['duration'])
                            recording.duration = timedelta(seconds=duration_seconds)
                        except (ValueError, TypeError):
                            pass
                    
                    if 'size' in recording_data:
                        try:
                            recording.size = int(recording_data['size'])
                        except (ValueError, TypeError):
                            pass
                            
                recording.save()
                return 'COMPLETED'
        
        # If API call succeeded but no recordings, it's still processing
        return recording.status
    except Exception as e:
        logger.error(f"Error checking recording status: {str(e)}")
        return None