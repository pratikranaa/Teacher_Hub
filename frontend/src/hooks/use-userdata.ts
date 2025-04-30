import { useState, useEffect } from "react"
import { BASE_API_URL } from "@/lib/config"

export interface UserData {
  // Base User fields
  id: string;
  user_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'INTERNAL_TEACHER' | 'EXTERNAL_TEACHER' | 'STUDENT';
  phone_number?: string;
  profile_image?: string;
  profile_completed: boolean;
  profile_verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verification_notes?: string;
  
  // Teacher Profile fields
  teacher_profile?: {
    qualification: any;
    subjects: string[];
    experience_years: number;
    preferred_classes?: string[];
    preferred_boards?: string[];
    teaching_methodology?: string;
    hourly_rate?: number;
    availability_status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
    availability_schedule?: Record<string, any>;
    languages?: string[];
    can_teach_online: boolean;
    can_travel: boolean;
    document_verification_status?: string;
    travel_radius?: number;
    rating?: number;
    total_sessions?: number;
    school?: {
      id: string;
      school_name: string;
    };
    teacher_type: 'INTERNAL' | 'EXTERNAL';
  };
  
  // Student Profile fields
  student_profile?: {
    grade: string;
    section: string;
    roll_number?: string;
    parent_name: string;
    parent_phone: string;
    parent_email?: string;
    date_of_birth?: string;
    school: {
      id: string;
      school_name: string;
    };
  };
  
  // School Staff Profile fields
  school_staff_profile?: {
    role: 'ADMIN' | 'PRINCIPAL' | 'TEACHER';
    department?: string;
    employee_id?: string;
    joining_date?: string;
    school: {
      id: string;
      school_name: string;
    };
  };
  
  // School Profile fields (for SCHOOL_ADMIN)
  school_profile?: {
    id: string;
    school_name: string;
    category: string;
    board_type: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    website?: string;
    contact_person: string;
    registration_number: string;
    established_year: number;
    subscription_status?: string;
    matching_algorithm_settings?: {
      batch_size?: number;
      wait_time_minutes?: number;
      weights?: {
        qualification?: {
          PhD: number;
          Masters: number;
          Bachelors: number;
        };
        rating_multiplier?: number;
        experience_multiplier?: number;
      };
      experience_weight?: number;
      rating_weight?: number;
      distance_weight?: number;
    };
  };
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("accessToken")
        
        if (!token) {
          throw new Error("No access token found")
        }
        
        const response = await fetch(`${BASE_API_URL}/api/profile/`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user profile")
        }

        const data = await response.json()
        
        // If user is a school admin, fetch algorithm settings
        if (data.user_type === 'SCHOOL_ADMIN' && data.school_profile) {
          try {
            const algorithmResponse = await fetch(`${BASE_API_URL}/api/schools/algorithm-settings/`, {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            })
            
            if (algorithmResponse.ok) {
              const algorithmData = await algorithmResponse.json()
              // Merge algorithm settings with school profile data
              data.school_profile.matching_algorithm_settings = algorithmData
            }
          } catch (algorithmErr) {
            console.error("Error fetching algorithm settings:", algorithmErr)
            // Continue with user data even if algorithm settings fail
          }
        }
        
        setUserData(data)
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError(err instanceof Error ? err.message : "Failed to load user profile")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  return { userData, isLoading, error }
}