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
    "hostToken": False,
    "isAutoRecordingEnabled": True  # Set to True to enable auto-recording

    })
    headers = {
    'Content-Type': 'application/json',
    "Authorization": f"Bearer {token}"  # Add the generated JWT
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    if response.status_code == 200:
        print("Meeting created successfully!")
        return response.json()
    else:
        print(f"Failed to create meeting. Status code: {response.status_code}")
        return response.text
    
def send_assignment_email(teacher_email, meeting_link, request):
    # Send email to assigned teacher
    pass