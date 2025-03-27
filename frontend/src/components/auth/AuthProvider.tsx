"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { refreshAuthToken, getAuthTokens, clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const tokens = getAuthTokens();
      
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        setLoading(false);
        return;
      }

      try {
        await refreshAuthToken();
        setIsAuthenticated(true);
      } catch (error) {
        clearAuth();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set up token refresh interval
    const refreshInterval = setInterval(async () => {
      const tokens = getAuthTokens();
      if (tokens?.refreshToken) {
        try {
          await refreshAuthToken();
        } catch (error) {
          clearAuth();
          router.push('/login');
        }
      }
    }, 4 * 60 * 1000); // Refresh every 4 minutes

    return () => clearInterval(refreshInterval);
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);