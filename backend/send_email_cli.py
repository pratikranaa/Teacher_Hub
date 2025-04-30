#!/usr/bin/env python
"""
Standalone email sending script
This script can be called directly from the command line to send emails.
It bypasses Django's email system completely for more reliable operation.
"""
import os
import sys
import smtplib
import argparse
import json
import time
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

# Add the project directory to sys.path so we can import django settings
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Initialize Django to get settings
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def send_email(to_email, subject, body, from_email=None, retries=3, max_retry_delay=15):
    """Send an email directly using smtplib"""
    # Use Django settings
    EMAIL_HOST = settings.EMAIL_HOST
    EMAIL_PORT = settings.EMAIL_PORT
    EMAIL_HOST_USER = settings.EMAIL_HOST_USER
    EMAIL_HOST_PASSWORD = settings.EMAIL_HOST_PASSWORD
    EMAIL_USE_TLS = settings.EMAIL_USE_TLS
    
    if from_email is None:
        from_email = EMAIL_HOST_USER
    
    print(f"Sending email to: {to_email}")
    print(f"Subject: {subject}")
    print(f"From: {from_email}")
    print("-" * 50)
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    # Try with retries
    for attempt in range(retries):
        try:
            # Create connection
            print(f"Attempt {attempt+1}/{retries}: Connecting to {EMAIL_HOST}:{EMAIL_PORT}...")
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=30)
            
            # Debug level
            # server.set_debuglevel(1)
            
            # TLS if needed
            if EMAIL_USE_TLS:
                print("Starting TLS...")
                server.starttls()
                
            # Login
            print(f"Logging in as {EMAIL_HOST_USER}...")
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            
            # Send
            print(f"Sending email to {to_email}...")
            server.send_message(msg)
            
            # Close
            print("Closing connection...")
            server.quit()
            
            print("\nEmail sent successfully!")
            return True
        
        except Exception as e:
            print(f"\nERROR on attempt {attempt+1}: {type(e).__name__}: {str(e)}")
            
            if attempt < retries - 1:
                # Calculate delay with jitter
                delay = min(2 ** attempt, max_retry_delay)
                jitter = random.uniform(0, delay * 0.3)  # Add up to 30% jitter
                wait_time = delay + jitter
                print(f"Retrying in {wait_time:.2f} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Failed to send email after {retries} attempts")
                return False

def main():
    """Main function for CLI email sending"""
    parser = argparse.ArgumentParser(description='Send email from command line')
    parser.add_argument('--to', required=True, help='Recipient email address')
    parser.add_argument('--subject', required=True, help='Email subject')
    parser.add_argument('--body', help='Email body text')
    parser.add_argument('--body-file', help='File containing email body (alternative to --body)')
    parser.add_argument('--from', dest='from_email', help='Sender email address')
    parser.add_argument('--json', help='JSON string with email details (alternative to other parameters)')
    parser.add_argument('--json-file', help='JSON file with email details (alternative to other parameters)')
    parser.add_argument('--retries', type=int, default=3, help='Number of retry attempts')
    
    args = parser.parse_args()
    
    # Handle JSON input
    if args.json:
        try:
            data = json.loads(args.json)
            to_email = data.get('to')
            subject = data.get('subject')
            body = data.get('body')
            from_email = data.get('from')
            retries = data.get('retries', args.retries)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {str(e)}")
            return 1
            
    elif args.json_file:
        try:
            with open(args.json_file, 'r') as f:
                data = json.load(f)
            to_email = data.get('to')
            subject = data.get('subject')
            body = data.get('body')
            from_email = data.get('from')
            retries = data.get('retries', args.retries)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading JSON file: {str(e)}")
            return 1
    else:
        # Use direct parameters
        to_email = args.to
        subject = args.subject
        from_email = args.from_email
        retries = args.retries
        
        if args.body_file:
            try:
                with open(args.body_file, 'r') as f:
                    body = f.read()
            except IOError as e:
                print(f"Error reading body file: {str(e)}")
                return 1
        else:
            body = args.body
    
    # Validate required fields
    if not to_email or not subject or not body:
        print("Error: Missing required email fields (to, subject, body)")
        return 1
    
    # Send the email
    success = send_email(to_email, subject, body, from_email, retries)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
