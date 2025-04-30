import requests
import json
import jwt  # Install using: pip install pyjwt
import os
from decouple import config



def token_generator_jiomeet():
    app_id = config('APP_ID_JIO')
    secret_key = config('SECRET_KEY_JIO')

    # Prepare the payload.
    payload = {
        "app": app_id,
    }

    # Sign the token using HS256 algorithm.
    token = jwt.encode(payload, secret_key, algorithm="HS256")

    return token


def create_jiomeet_meeting(name, title, description):
    url = "https://jiomeetpro.jio.com/api/platform/v1/room"
    
    token = token_generator_jiomeet()
    
    payload = json.dumps({
        "name": name,
        "title": title,
        "description": description,
        "hostToken": True,  # Ensure this is True to get the host token
        "isAutoRecordingEnabled": True
    })
    
    headers = {
        'Content-Type': 'application/json',
        "Authorization": f"Bearer {token}"
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    if response.status_code == 200:
        data = response.json()
        print("Meeting created successfully!")
        
        # Extract guest meeting link and create host link
        guest_link = data.get('guestMeetingLink') or data.get('meetingLink')
        host_token = data.get('hostToken', '')
        
        # Create host link by appending hostToken to the guest link
        if guest_link and host_token:
            # Check if the URL already has parameters
            separator = '&' if '?' in guest_link else '?'
            host_link = f"{guest_link}{separator}hostToken={host_token}"
            data['host_link'] = host_link
            
        return data
    else:
        print(f"Failed to create meeting. Status code: {response.status_code}")
        return response.text
    
def send_assignment_email(teacher_email, meeting_link, request):
    # Send email to assigned teacher
    pass