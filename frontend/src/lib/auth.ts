export const getAuthTokens = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  }
}

export const getUserType = () => {
  if (typeof window === 'undefined') return null;

  const userType = localStorage.getItem('usertype')
  return userType ? JSON.parse(userType) : null
}

export const getUserData = () => {
  if (typeof window === 'undefined') return null;
  
  const userDataString = localStorage.getItem('userData')
  return userDataString ? JSON.parse(userDataString) : null
}

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('userData')
  localStorage.removeItem('usertype')
  
}

export const isAuthenticated = () => {
  const tokens = getAuthTokens()
  return !!tokens?.accessToken
}

// Add these functions to your existing auth.ts file
export const refreshAuthToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch('http://127.0.0.1:8000/api/login-refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('usertype', data.user_type);
      return data.access;
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    clearAuth();
    throw error;
  }
};

export const createAuthenticatedFetch = () => {
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    // Get the access token
    let accessToken = localStorage.getItem('accessToken');

    // First attempt with current access token
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If we get a 401, try to refresh the token
    if (response.status === 401) {
      try {
        accessToken = await refreshAuthToken();
        
        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        throw new Error('Authentication failed', { cause: error });
      }
    }

    return response;
  };

  return fetchWithAuth;
};