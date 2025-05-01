import { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { BASE_API_URL } from '@/lib/config';
import { User } from '@/lib/placeholder-data';

interface UserDisplayProps {
  userId: string;
  type?: 'teacher' | 'student' | 'staff';
  fallbackText?: string;
}

interface UserData {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_image?: string;
}

export function UserDisplay({ userId, type = 'teacher', fallbackText = "User" }: UserDisplayProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        const token = localStorage.getItem("accessToken");
        
        // Using our new profile-by-id endpoint
        const response = await fetch(`${BASE_API_URL}/api/profile-by-id/${userId}/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  if (loading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (error || !userData) {
    // Format UUID for display - show first 8 chars with ellipsis
    const shortId = userId?.substring(0, 8);
    return (
      <div className="flex flex-col">
        <span className="font-medium">{fallbackText}</span>
        <span className="text-xs text-muted-foreground">ID: {shortId}...</span>
      </div>
    );
  }

  // Format name based on available data
  const displayName = userData.first_name && userData.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : userData.first_name || userData.last_name || userData.username || userData.email?.split('@')[0] || fallbackText;

  return (
    <div className="flex flex-col">
      <span className="font-medium">{displayName}</span>
      {userData.email && <span className="text-xs text-muted-foreground">{userData.email}</span>}
    </div>
  );
}