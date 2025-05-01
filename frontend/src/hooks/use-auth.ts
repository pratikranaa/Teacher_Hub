import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUserData } from '@/lib/auth';

export function useRequireAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check client-side authentication status
    const checkAuth = () => {
      if (!isAuthenticated()) {
        console.log("User not authenticated, redirecting to login");
        router.push('/login');
        return false;
      }
      return true;
    };

    const isAuth = checkAuth();
    setAuthenticated(isAuth);
    setLoading(false);

    // Set up an interval to periodically check authentication status
    const interval = setInterval(checkAuth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [router]);

  return { loading, authenticated };
}

// Hook for pages that need userData
export function useAuthWithUserData() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Check if user is authenticated and get user data
    if (!isAuthenticated()) {
      console.log("User not authenticated, redirecting to login");
      router.push('/login');
      return;
    }

    // Get user data from localStorage
    const data = getUserData();
    if (!data) {
      console.log("No user data found, redirecting to login");
      router.push('/login');
      return;
    }

    setUserData(data);
    setLoading(false);
  }, [router]);

  return { loading, userData };
}