from django.core.mail import EmailMessage
from django.core.mail.backends.smtp import EmailBackend
from backend.settings import EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS
from django.core.mail import send_mail
from rest_framework import status
import logging
import socket
import traceback
import smtplib
import threading
import time
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)

"""
DIRECT SMTP EMAIL FUNCTION
This implementation uses the standard smtplib library directly, 
bypassing Django's email system for more reliable delivery.
"""

def send_direct_smtp_email(subject, message, recipient, sender=None, attachment_path=None):
    """
    Send email using direct SMTP connection - based on the working debug script.
    This implementation avoids Django's email system entirely for greater reliability.
    
    Args:
        subject: Email subject
        message: Email body text
        recipient: Email recipient address
        sender: Email sender address (defaults to EMAIL_HOST_USER)
        attachment_path: Optional file path to attach
        
    Returns:
        True for success, False for failure
    """
    # Use the sender if provided, otherwise use the default email
    if sender is None:
        sender = EMAIL_HOST_USER
    
    request_id = random.randint(1000, 9999)
    logger.info(f"[DIRECT-EMAIL-{request_id}] Starting email send to {recipient}")
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(message, 'plain'))
    
    # Add attachment if provided
    if attachment_path and os.path.exists(attachment_path):
        try:
            from email.mime.application import MIMEApplication
            with open(attachment_path, 'rb') as file:
                part = MIMEApplication(file.read(), Name=os.path.basename(attachment_path))
            part['Content-Disposition'] = f'attachment; filename="{os.path.basename(attachment_path)}"'
            msg.attach(part)
            logger.info(f"[DIRECT-EMAIL-{request_id}] Attached file: {attachment_path}")
        except Exception as e:
            logger.warning(f"[DIRECT-EMAIL-{request_id}] Failed to attach file: {str(e)}")
    
    # Maximum retry attempts
    max_retries = 3
    
    # Try sending with retries
    for attempt in range(max_retries):
        try:
            # Create connection
            logger.info(f"[DIRECT-EMAIL-{request_id}] Connecting to {EMAIL_HOST}:{EMAIL_PORT}...")
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=30)
            
            # Optional debugging
            # server.set_debuglevel(1)
            
            # TLS if needed
            if EMAIL_USE_TLS:
                logger.info(f"[DIRECT-EMAIL-{request_id}] Starting TLS...")
                server.starttls()
                
            # Login
            logger.info(f"[DIRECT-EMAIL-{request_id}] Logging in as {EMAIL_HOST_USER}...")
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            
            # Send
            logger.info(f"[DIRECT-EMAIL-{request_id}] Sending email to {recipient}...")
            server.send_message(msg)
            
            # Close
            logger.info(f"[DIRECT-EMAIL-{request_id}] Closing connection...")
            server.quit()
            
            logger.info(f"[DIRECT-EMAIL-{request_id}] Email sent successfully!")
            return True
            
        except (ConnectionRefusedError, socket.gaierror, socket.timeout, 
                smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError) as e:
            logger.warning(f"[DIRECT-EMAIL-{request_id}] Connection error on attempt {attempt+1}: {str(e)}")
            
            if attempt < max_retries - 1:
                delay = 2 ** attempt  # Exponential backoff: 1, 2, 4 seconds
                logger.info(f"[DIRECT-EMAIL-{request_id}] Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                logger.error(f"[DIRECT-EMAIL-{request_id}] Failed after {max_retries} attempts: {str(e)}")
                return False
                
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[DIRECT-EMAIL-{request_id}] Authentication failed: {str(e)}")
            return False
            
        except Exception as e:
            logger.error(f"[DIRECT-EMAIL-{request_id}] Unexpected error: {type(e).__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            
            if attempt < max_retries - 1:
                delay = 2 ** attempt
                logger.info(f"[DIRECT-EMAIL-{request_id}] Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                return False

# Update the send_email function to use the direct SMTP method
def send_email(subject, message, mail_to, mail_from=None, attachement=None):
    """Compatibility wrapper for existing code - now using direct SMTP"""
    return send_direct_smtp_email(subject, message, mail_to, mail_from, attachement)

# Simple function to send bulk emails
def send_bulk_emails_simple(emails):
    """Send multiple emails with the direct SMTP function"""
    results = {
        "success_count": 0,
        "failure_count": 0,
        "failed_recipients": []
    }
    
    for email in emails:
        recipients = email.get('recipients', [])
        if not isinstance(recipients, list):
            recipients = [recipients]
            
        for recipient in recipients:
            success = send_direct_smtp_email(
                subject=email.get('subject', ''),
                message=email.get('message', ''),
                recipient=recipient,
                sender=email.get('from_email'),
                attachment_path=email.get('attachment')
            )
            
            if success:
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
                results["failed_recipients"].append(recipient)
    
    return results

# Update the send_bulk_emails function to use the new implementation
send_bulk_emails = send_bulk_emails_simple

# Function to test email configuration
def test_email_config():
    """Test current email configuration and return diagnostic information"""
    import smtplib
    
    result = {
        "success": False,
        "host": EMAIL_HOST,
        "port": EMAIL_PORT,
        "user": EMAIL_HOST_USER,
        "use_tls": EMAIL_USE_TLS,
        "error": None,
        "details": None
    }
    
    try:
        # Test direct connection to SMTP server
        logger.info(f"Testing connection to SMTP server {EMAIL_HOST}:{EMAIL_PORT}")
        
        # Try direct connection with timeout
        if EMAIL_USE_TLS:
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)
            
        # Test authentication
        server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
        result["success"] = True
        result["details"] = "Connection and authentication successful"
        
        # Close connection
        try:
            server.quit()
        except:
            pass
        
    except socket.gaierror:
        result["error"] = "DNS resolution error"
        result["details"] = f"Could not resolve hostname {EMAIL_HOST}"
    except socket.timeout:
        result["error"] = "Connection timeout" 
        result["details"] = f"Connection to {EMAIL_HOST}:{EMAIL_PORT} timed out"
    except ConnectionRefusedError:
        result["error"] = "Connection refused"
        result["details"] = f"Connection to {EMAIL_HOST}:{EMAIL_PORT} was refused"
    except smtplib.SMTPAuthenticationError:
        result["error"] = "Authentication failed"
        result["details"] = "Username or password incorrect"
    except Exception as e:
        result["error"] = f"{type(e).__name__}"
        result["details"] = str(e)
        
    return result

## Uniform api response
def success(count):
    response = {
                    'inserted': str(count)+" row(s) inserted successfully",
                    "status" : "success",
                    "code"   : status.HTTP_200_OK
                }
    return response

def error(msg):
    response = {
                    "message": msg,
                    "status" : "error",
                    "code"   : status.HTTP_400_BAD_REQUEST
                }
    return response

def success_def(count,defective_data):
    response = {
                    'inserted': str(count)+" row(s) inserted successfully",
                    "status" : "success",
                    "rejected_records" : defective_data,
                    "code"   : status.HTTP_200_OK
                }
    return response

def success_msg(msg):
    response = {
                    "message": msg,
                    "status" : "success",
                    "code"   : status.HTTP_201_CREATED
                }
    return response

#*************** Encode API Name **************
def encode_api_name(value):
    value=str(value)
    lowercase = value.lower()
    value = lowercase.replace(" ", "_")
    return value

#*************** Decode API name ***************
def decode_api_name(value):
    captalize = value.title()
    value = captalize.replace("_", " ")
    return value


from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.contenttypes.models import ContentType

class ProfileChangeLoggingMixin:
    def perform_update(self, serializer):
        instance = serializer.instance
        changed_fields = []
        
        for field, value in serializer.validated_data.items():
            if getattr(instance, field) != value:
                changed_fields.append(field)
        
        # Save the changes
        instance = serializer.save()
        
        # Log the change
        if changed_fields:
            LogEntry.objects.create(
                user_id=self.request.user.id,
                content_type_id=ContentType.objects.get_for_model(instance).id,
                object_id=instance.id,
                object_repr=str(instance),
                action_flag=CHANGE,
                change_message=f"Changed {', '.join(changed_fields)}"
            )