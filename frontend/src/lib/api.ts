import axios from 'axios';
import { getAuthTokens } from './auth'; // Adjust the import path as necessary
import { access } from 'fs';

const API_URL = "http://127.0.0.1:8000";

// Get all requests for the current user
export const getUserRequests = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/`);
};

// Get all assigned requests for the current user
export const getAssignedRequests = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/assigned/`);
};

// Get all request history for the current user
export const getRequestHistory = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/history/`);
};

// Get all pending invitations for the current user
export const getPendingInvitations = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/invitations/pending/`);
};

// Get all accepted invitations for the current user
export const getAcceptedInvitations = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/invitations/accepted/`);
};

// Get all declined invitations for the current user
export const getDeclinedInvitations = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/invitations/declined/`);
};

// Get all completed invitations for the current user
export const getCompletedInvitations = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/invitations/completed/`);
};

// Get all canceled invitations for the current user
export const getCanceledInvitations = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/invitations/canceled/`);
};

// Get all canceled requests for the current user
export const getCanceledRequests = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/canceled/`);
};

// Get all completed requests for the current user
export const getCompletedRequests = async () => {
  return axios.get(`${API_URL}/api/substitute-requests/completed/`);
};

// Get a specific request
export const getRequest = async (id) => {
  return axios.get(`${API_URL}/api/substitute-requests/${id}/`);
};

// Create a new request
export const createRequest = async (requestData) => {
  return axios.post(`${API_URL}/api/substitute-requests/`, requestData);
};

export async function acceptSubstituteRequest(requestId: string) {
  const token = getAuthTokens()?.accessToken;
  const response = await fetch(`${API_URL}/api/substitute-requests/${requestId}/accept_request/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to accept request: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function declineSubstituteRequest(requestId: string, rejectionNote: string) {
  const token = getAuthTokens()?.accessToken;

  const response = await fetch(`${API_URL}/api/substitute-requests/${requestId}/decline_request/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      response_note: rejectionNote 
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to decline request: ${response.statusText}`);
  }
  
  return await response.json();
}

// Get form options (subjects, grades, etc)
export const getFormOptions = async () => {
  return axios.get(`${API_URL}/api/substitute-form-options/`);
};

// Get invitation history for a request
export const getInvitationHistory = async (id) => {
  return axios.get(`${API_URL}/api/substitute-requests/${id}/invitation_history/`);
};

// Get all session recordings
export async function fetchSessionRecordings() {
  const token = localStorage.getItem("accessToken");
  
  const response = await fetch(`${API_URL}/api/teaching-sessions/recordings/`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch session recordings");
  }
  
  return await response.json();
}

// Get recording URL for a specific recording
export async function fetchRecordingUrl(recordingId) {
  const token = localStorage.getItem("accessToken");
  
  const response = await fetch(`${API_URL}/api/teaching-sessions/recordings/${recordingId}/fetch_recording_url/`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch recording URL");
  }
  
  return await response.json();
}

// Play a recording in a new window
export function playRecording(recordingUrl, jwt) {
  if (!recordingUrl) return;
  
  // Create URL with JWT token if provided
  const url = jwt ? `${recordingUrl}?token=${jwt}` : recordingUrl;
  window.open(url, '_blank');
}

// Download a recording
export async function downloadRecording(recordingUrl, jwt, filename = 'recording.mp4') {
  if (!recordingUrl) return;
  
  try {
    // Create a hidden link with download attribute
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = jwt ? `${recordingUrl}?token=${jwt}` : recordingUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error("Error downloading recording:", error);
    throw error;
  }
}