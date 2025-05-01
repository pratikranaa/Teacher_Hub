"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserData } from "@/hooks/use-userdata"
import { useToast } from "@/hooks/use-toast"
import { isAuthenticated } from "@/lib/auth"
import { useRequireAuth } from "@/hooks/use-auth"
import { BASE_API_URL } from "@/lib/config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarRight } from "@/components/sidebar-right"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, School, GraduationCap, UserCheck, Settings, Save, Upload } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarLeft } from "@/components/sidebar-left"

export default function AccountPage() {
  const router = useRouter()
  const { loading: authLoading } = useRequireAuth() // Client-side auth protection
  const { userData, isLoading: userLoading, error: userError, refreshUserData } = useUserData()
  const [formData, setFormData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [isTabDataLoading, setIsTabDataLoading] = useState(false)
  const [algorithmSettings, setAlgorithmSettings] = useState<any>({
    batch_size: 10,
    wait_time_minutes: 30,
    experience_weight: 3,
    rating_weight: 4,
    distance_weight: 2,
    weights: {
      qualification: {
        PhD: 5,
        Masters: 3,
        Bachelors: 1
      }
    }
  })
  const { toast } = useToast()

  // Additional auth check when the component mounts
  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("User not authenticated in AccountPage, redirecting to login")
      router.push('/login')
      return
    }
  }, [router])

  useEffect(() => {
    if (userData) {
      console.log("userData received:", userData)
      console.log("School profile data:", userData.school_profile)
      
      const initialData: any = {
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone_number: userData.phone_number || "",
      }

      if (userData.teacher_profile) {
        initialData.qualification = userData.teacher_profile.qualification || ""
        initialData.subjects = userData.teacher_profile.subjects?.join(", ") || ""
        initialData.experience_years = userData.teacher_profile.experience_years || 0
        initialData.preferred_classes = userData.teacher_profile.preferred_classes?.join(", ") || ""
        initialData.teaching_methodology = userData.teacher_profile.teaching_methodology || ""
        initialData.languages = userData.teacher_profile.languages?.join(", ") || ""
        initialData.can_teach_online = userData.teacher_profile.can_teach_online || false
        initialData.can_travel = userData.teacher_profile.can_travel || false
        initialData.travel_radius = userData.teacher_profile.travel_radius || 0
        initialData.hourly_rate = userData.teacher_profile.hourly_rate || 0
        initialData.availability_status = userData.teacher_profile.availability_status || "UNAVAILABLE"
      }

      if (userData.student_profile) {
        initialData.grade = userData.student_profile.grade || ""
        initialData.section = userData.student_profile.section || ""
        initialData.roll_number = userData.student_profile.roll_number || ""
        initialData.parent_name = userData.student_profile.parent_name || ""
        initialData.parent_phone = userData.student_profile.parent_phone || ""
        initialData.parent_email = userData.student_profile.parent_email || ""
        initialData.date_of_birth = userData.student_profile.date_of_birth || ""
      }

      if (userData.school_staff_profile) {
        initialData.department = userData.school_staff_profile.department || ""
        initialData.employee_id = userData.school_staff_profile.employee_id || ""
        initialData.joining_date = userData.school_staff_profile.joining_date || ""
      }

      // For school admins, school data is at the root level of userData
      if (userData.user_type === 'SCHOOL_ADMIN') {
        initialData.school_name = userData.school_name || ""
        initialData.category = userData.category || ""
        initialData.board_type = userData.board_type || ""
        initialData.address = userData.address || ""
        initialData.city = userData.city || ""
        initialData.state = userData.state || ""
        initialData.country = userData.country || ""
        initialData.postal_code = userData.postal_code || ""
        initialData.website = userData.website || ""
        initialData.contact_person = userData.contact_person || ""
        initialData.registration_number = userData.registration_number || ""
        initialData.established_year = userData.established_year || ""
        console.log("School data loaded from userData root:", initialData)
      } 
      // Legacy support if school_profile exists
      else if (userData.school_profile) {
        initialData.school_name = userData.school_profile.school_name || ""
        initialData.category = userData.school_profile.category || ""
        initialData.board_type = userData.school_profile.board_type || ""
        initialData.address = userData.school_profile.address || ""
        initialData.city = userData.school_profile.city || ""
        initialData.state = userData.school_profile.state || ""
        initialData.country = userData.school_profile.country || ""
        initialData.postal_code = userData.school_profile.postal_code || ""
        initialData.website = userData.school_profile.website || ""
        initialData.contact_person = userData.school_profile.contact_person || ""
        initialData.registration_number = userData.school_profile.registration_number || ""
        initialData.established_year = userData.school_profile.established_year || ""
      }

      setFormData(initialData)
      setImagePreview(userData.profile_image || null)

      if (userData.user_type === 'SCHOOL_ADMIN' && userData.school_profile?.matching_algorithm_settings) {
        const settings = userData.school_profile.matching_algorithm_settings;
        setAlgorithmSettings({
          batch_size: settings.batch_size || 10,
          wait_time_minutes: settings.wait_time_minutes || 30,
          experience_weight: settings.experience_weight || 3,
          rating_weight: settings.rating_weight || 4,
          distance_weight: settings.distance_weight || 2,
          weights: {
            qualification: {
              PhD: settings.weights?.qualification?.PhD || 5,
              Masters: settings.weights?.qualification?.Masters || 3,
              Bachelors: settings.weights?.qualification?.Bachelors || 1
            }
          }
        });
      }
    }
  }, [userData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("Form being submitted with data:", formData)
      console.log("Current tab:", document.querySelector(".tabs-trigger[aria-selected='true']")?.getAttribute("data-value"))
      
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('profile_image', imageFile)
        
        const imageResponse = await fetch(`${BASE_API_URL}/api/profile/upload_image/`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
          },
          body: imageFormData
        })
        
        if (!imageResponse.ok) {
          throw new Error("Failed to upload profile image")
        }
      }

      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      }

      if (userData?.user_type.includes('TEACHER')) {
        updateData.teacher_profile = {
          qualification: formData.qualification,
          subjects: formData.subjects?.split(',').map((s: string) => s.trim()),
          experience_years: Number(formData.experience_years),
          preferred_classes: formData.preferred_classes?.split(',').map((c: string) => c.trim()),
          teaching_methodology: formData.teaching_methodology,
          languages: formData.languages?.split(',').map((l: string) => l.trim()),
          can_teach_online: Boolean(formData.can_teach_online),
          can_travel: Boolean(formData.can_travel),
          travel_radius: Number(formData.travel_radius),
          hourly_rate: Number(formData.hourly_rate),
          availability_status: formData.availability_status
        }
      }

      if (userData?.user_type === 'STUDENT') {
        updateData.student_profile = {
          grade: formData.grade,
          section: formData.section,
          roll_number: formData.roll_number,
          parent_name: formData.parent_name,
          parent_phone: formData.parent_phone,
          parent_email: formData.parent_email,
          date_of_birth: formData.date_of_birth
        }
      }

      if (userData?.user_type === 'SCHOOL_ADMIN' || userData?.user_type === 'PRINCIPAL') {
        updateData.school_staff_profile = {
          department: formData.department,
          employee_id: formData.employee_id,
          joining_date: formData.joining_date
        }
      }
      
      // Add school profile data separately for school admins
      if (userData?.user_type === 'SCHOOL_ADMIN') {
        updateData.school_profile = {
          school_name: formData.school_name,
          category: formData.category,
          board_type: formData.board_type,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postal_code: formData.postal_code,
          website: formData.website,
          contact_person: formData.contact_person,
          registration_number: formData.registration_number,
          established_year: Number(formData.established_year)
        }
      }

      const response = await fetch(`${BASE_API_URL}/api/profile/`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : 'Failed to update profile')
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAlgorithmSettings = async (settings: any) => {
    try {
      const backendSettings = {
        batch_size: settings.batch_size || 5,
        wait_time_minutes: settings.wait_time_minutes || 30,
        weights: {
          qualification: {
            PhD: settings.weights?.qualification?.PhD || 5.0,
            Masters: settings.weights?.qualification?.Masters || 3.0,
            Bachelors: settings.weights?.qualification?.Bachelors || 1.0
          },
          rating_multiplier: {
            factor: settings.rating_weight || 4.0
          },
          experience_multiplier: {
            factor: settings.experience_weight || 3.0
          },
          distance_multiplier: {
            factor: settings.distance_weight || 2.0
          }
        }
      };
      
      console.log("Sending algorithm settings:", backendSettings);

      const response = await fetch(`${BASE_API_URL}/api/school/algorithm-settings/`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(backendSettings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Algorithm settings error:", errorData);
        throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : "Failed to update algorithm settings");
      }
      
      const updatedSettings = await response.json();
      
      setAlgorithmSettings({
        ...settings,
        batch_size: updatedSettings.batch_size || settings.batch_size,
        wait_time_minutes: updatedSettings.wait_time_minutes || settings.wait_time_minutes,
      });
      
      if (userData && userData.school_profile) {
        userData.school_profile.matching_algorithm_settings = updatedSettings;
        refreshUserData();
      }

      toast({
        title: "Success",
        description: "Algorithm settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating algorithm settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update algorithm settings",
        variant: "destructive"
      });
    }
  }

  const handleAlgorithmSettingChange = (field: string, value: any) => {
    setAlgorithmSettings(prev => {
      if (field.includes('.')) {
        const [parentField, childField, grandchildField] = field.split('.');
        if (grandchildField) {
          return {
            ...prev,
            [parentField]: {
              ...prev[parentField],
              [childField]: {
                ...prev[parentField]?.[childField],
                [grandchildField]: value
              }
            }
          };
        } else {
          return {
            ...prev,
            [parentField]: {
              ...prev[parentField],
              [childField]: value
            }
          };
        }
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  };

  if (userLoading || authLoading) {
    return (
      <div className="flex h-[100vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile...</span>
      </div>
    )
  }

  if (userError || !userData) {
    return (
      <div className="flex h-[100vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Error Loading Profile</h1>
        <p>{userError || "Unknown error occurred"}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <SidebarLeft  />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Account</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
          </div>
        </header>

        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold">Account Settings</h1>
              <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
                <TabsTrigger 
                  value="profile"
                  onClick={async () => {
                    console.log("Profile tab clicked")
                    setActiveTab("profile")
                    setIsTabDataLoading(true)
                    try {
                      // Fetch fresh profile data from API
                      const token = localStorage.getItem("accessToken");
                      const response = await fetch(`${BASE_API_URL}/api/profile/`, {
                        headers: {
                          "Authorization": `Bearer ${token}`
                        }
                      });
                      
                      if (response.ok) {
                        const freshData = await response.json();
                        console.log("Fresh profile data:", freshData);
                        
                        // Set up initial form data from fresh data
                        const initialData: any = {
                          first_name: freshData.first_name || "",
                          last_name: freshData.last_name || "",
                          phone_number: freshData.phone_number || "",
                        }
                        
                        if (freshData.teacher_profile) {
                          initialData.qualification = freshData.teacher_profile.qualification || ""
                          initialData.subjects = freshData.teacher_profile.subjects?.join(", ") || ""
                          initialData.experience_years = freshData.teacher_profile.experience_years || 0
                          initialData.preferred_classes = freshData.teacher_profile.preferred_classes?.join(", ") || ""
                          initialData.teaching_methodology = freshData.teacher_profile.teaching_methodology || ""
                          initialData.languages = freshData.teacher_profile.languages?.join(", ") || ""
                          initialData.can_teach_online = freshData.teacher_profile.can_teach_online || false
                          initialData.can_travel = freshData.teacher_profile.can_travel || false
                          initialData.travel_radius = freshData.teacher_profile.travel_radius || 0
                          initialData.hourly_rate = freshData.teacher_profile.hourly_rate || 0
                          initialData.availability_status = freshData.teacher_profile.availability_status || "UNAVAILABLE"
                        }

                        if (freshData.student_profile) {
                          initialData.grade = freshData.student_profile.grade || ""
                          initialData.section = freshData.student_profile.section || ""
                          initialData.roll_number = freshData.student_profile.roll_number || ""
                          initialData.parent_name = freshData.student_profile.parent_name || ""
                          initialData.parent_phone = freshData.student_profile.parent_phone || ""
                          initialData.parent_email = freshData.student_profile.parent_email || ""
                          initialData.date_of_birth = freshData.student_profile.date_of_birth || ""
                        }

                        if (freshData.school_staff_profile) {
                          initialData.department = freshData.school_staff_profile.department || ""
                          initialData.employee_id = freshData.school_staff_profile.employee_id || ""
                          initialData.joining_date = freshData.school_staff_profile.joining_date || ""
                        }
                        
                        // Update form data with fresh data
                        setFormData(initialData);
                        setImagePreview(freshData.profile_image || null);
                        
                        // Update userData with latest data
                        refreshUserData();
                        
                        
                      }
                    } catch (error) {
                      console.error("Error fetching profile data:", error);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to load profile data from server",
                      });
                    } finally {
                      setIsTabDataLoading(false)
                    }
                  }}
                >
                  Profile
                </TabsTrigger>
                {userData.user_type === 'SCHOOL_ADMIN' && (
                  <TabsTrigger 
                    value="school" 
                    onClick={async () => {
                      console.log("School tab clicked")
                      setActiveTab("school")
                      setIsTabDataLoading(true)
                      try {
                        // Fetch fresh profile data from API
                        const token = localStorage.getItem("accessToken");
                        const response = await fetch(`${BASE_API_URL}/api/profile/`, {
                          headers: {
                            "Authorization": `Bearer ${token}`
                          }
                        });
                        
                        if (response.ok) {
                          const freshData = await response.json();
                          console.log("Fresh school data:", freshData);
                          
                          // Update form with fresh data
                          setFormData(prev => ({
                            ...prev,
                            school_name: freshData.school_name || prev.school_name || "",
                            category: freshData.category || prev.category || "",
                            board_type: freshData.board_type || prev.board_type || "",
                            address: freshData.address || prev.address || "",
                            city: freshData.city || prev.city || "",
                            state: freshData.state || prev.state || "",
                            country: freshData.country || prev.country || "",
                            postal_code: freshData.postal_code || prev.postal_code || "",
                            website: freshData.website || prev.website || "",
                            contact_person: freshData.contact_person || prev.contact_person || "",
                            registration_number: freshData.registration_number || prev.registration_number || "",
                            established_year: freshData.established_year || prev.established_year || ""
                          }));
                          
                          // Update userData with latest data
                          refreshUserData();
                          
                        
                        }
                      } catch (error) {
                        console.error("Error fetching school data:", error);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Failed to load school data from server",
                        });
                      } finally {
                        setIsTabDataLoading(false)
                      }
                    }}
                  >
                    School
                  </TabsTrigger>
                )}
                {userData.user_type === 'SCHOOL_ADMIN' && (
                  <TabsTrigger 
                    value="algorithm"
                    onClick={async () => {
                      setActiveTab("algorithm")
                      setIsTabDataLoading(true)
                      try {
                        // Show initial values from userData while fetching
                        if (userData.school_profile?.matching_algorithm_settings) {
                          const settings = userData.school_profile.matching_algorithm_settings;
                          setAlgorithmSettings({
                            batch_size: settings.batch_size || 10,
                            wait_time_minutes: settings.wait_time_minutes || 30,
                            experience_weight: settings.weights?.experience_multiplier?.factor || 3,
                            rating_weight: settings.weights?.rating_multiplier?.factor || 4,
                            distance_weight: settings.weights?.distance_multiplier?.factor || 2,
                            weights: {
                              qualification: {
                                PhD: settings.weights?.qualification?.PhD || 5,
                                Masters: settings.weights?.qualification?.Masters || 3,
                                Bachelors: settings.weights?.qualification?.Bachelors || 1
                              }
                            }
                          });
                        }
                        
                        // Fetch fresh algorithm settings directly from API
                        const token = localStorage.getItem("accessToken");
                        const response = await fetch(`${BASE_API_URL}/api/school/algorithm-settings/`, {
                          headers: {
                            "Authorization": `Bearer ${token}`
                          }
                        });
                        
                        if (response.ok) {
                          const freshSettings = await response.json();
                          console.log("Fresh algorithm settings:", freshSettings);
                          
                          // Update with fresh data from backend
                          setAlgorithmSettings({
                            batch_size: freshSettings.batch_size || 10,
                            wait_time_minutes: freshSettings.wait_time_minutes || 30,
                            experience_weight: freshSettings.weights?.experience_multiplier?.factor || 3,
                            rating_weight: freshSettings.weights?.rating_multiplier?.factor || 4,
                            distance_weight: freshSettings.weights?.distance_multiplier?.factor || 2,
                            weights: {
                              qualification: {
                                PhD: freshSettings.weights?.qualification?.PhD || 5,
                                Masters: freshSettings.weights?.qualification?.Masters || 3,
                                Bachelors: freshSettings.weights?.qualification?.Bachelors || 1
                              }
                            }
                          });
                          
                          // Update userData with latest settings
                          if (userData && userData.school_profile) {
                            userData.school_profile.matching_algorithm_settings = freshSettings;
                          }
                          
                          
                        }
                      } catch (error) {
                        console.error("Error fetching algorithm settings:", error);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Failed to load algorithm settings from server",
                        });
                      } finally {
                        setIsTabDataLoading(false)
                      }
                    }}
                  >
                    Algorithm Settings
                  </TabsTrigger>
                )}
              </TabsList>

              {isTabDataLoading ? (
                <div className="flex h-[50vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading tab data...</span>
                </div>
              ) : (
                <>
                  <TabsContent value="profile">
                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-1">
                          <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                            <CardDescription>Update your profile picture</CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center gap-4">
                            <Avatar className="h-32 w-32">
                              <AvatarImage src={imagePreview || undefined} alt={userData.username} />
                              <AvatarFallback className="text-2xl">
                                {userData.first_name?.[0]}{userData.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex w-full flex-col gap-2">
                              <Label htmlFor="profile-picture">Upload new picture</Label>
                              <div className="flex items-center gap-2">
                                <Input 
                                  id="profile-picture"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                  className="hidden"
                                />
                                <Label 
                                  htmlFor="profile-picture" 
                                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                                >
                                  <Upload className="h-4 w-4" />
                                  Choose File
                                </Label>
                              </div>
                            </div>
                            
                            <div className="w-full">
                              <Label>Account Status</Label>
                              <Badge className={
                                userData.profile_verification_status === 'VERIFIED' ? 'bg-green-500' : 
                                userData.profile_verification_status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'
                              }>
                                {userData.profile_verification_status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="col-span-1 md:col-span-2">
                          <CardHeader>
                            <CardTitle>Basic Details</CardTitle>
                            <CardDescription>Update your basic information</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                  id="first_name"
                                  name="first_name"
                                  value={formData.first_name || ''}
                                  onChange={handleChange}
                                  placeholder="First Name"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                  id="last_name"
                                  name="last_name"
                                  value={formData.last_name || ''}
                                  onChange={handleChange}
                                  placeholder="Last Name"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                value={userData.email}
                                disabled
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="phone_number">Phone Number</Label>
                              <Input
                                id="phone_number"
                                name="phone_number"
                                value={formData.phone_number || ''}
                                onChange={handleChange}
                                placeholder="Phone Number"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="username">Username</Label>
                              <Input
                                id="username"
                                name="username"
                                value={userData.username}
                                disabled
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                            </div>
                          </CardContent>
                        </Card>

                        {userData.user_type.includes('TEACHER') && (
                          <Card className="col-span-1 md:col-span-3">
                            <CardHeader>
                              <CardTitle>Teacher Profile</CardTitle>
                              <CardDescription>Update your teacher-specific information</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="qualification">Qualification</Label>
                                <Input
                                  id="qualification"
                                  name="qualification"
                                  value={formData.qualification || ''}
                                  onChange={handleChange}
                                  placeholder="Educational Qualification"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="experience_years">Years of Experience</Label>
                                <Input
                                  id="experience_years"
                                  name="experience_years"
                                  type="number"
                                  value={formData.experience_years || 0}
                                  onChange={handleChange}
                                  min="0"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="subjects">Subjects (comma separated)</Label>
                                <Input
                                  id="subjects"
                                  name="subjects"
                                  value={formData.subjects || ''}
                                  onChange={handleChange}
                                  placeholder="Math, Science, History"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="preferred_classes">Preferred Classes (comma separated)</Label>
                                <Input
                                  id="preferred_classes"
                                  name="preferred_classes"
                                  value={formData.preferred_classes || ''}
                                  onChange={handleChange}
                                  placeholder="6th, 7th, 8th"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="languages">Languages (comma separated)</Label>
                                <Input
                                  id="languages"
                                  name="languages"
                                  value={formData.languages || ''}
                                  onChange={handleChange}
                                  placeholder="English, Hindi, Spanish"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                                <Input
                                  id="hourly_rate"
                                  name="hourly_rate"
                                  type="number"
                                  value={formData.hourly_rate || 0}
                                  onChange={handleChange}
                                  min="0"
                                />
                              </div>

                              <div className="flex flex-col gap-2 md:col-span-2">
                                <Label htmlFor="teaching_methodology">Teaching Methodology</Label>
                                <Textarea
                                  id="teaching_methodology"
                                  name="teaching_methodology"
                                  value={formData.teaching_methodology || ''}
                                  onChange={handleChange}
                                  placeholder="Describe your teaching methodology"
                                  className="h-24"
                                />
                              </div>

                              <div className="flex items-center gap-4">
                                <Label htmlFor="can_teach_online" className="flex-1">Available for Online Teaching</Label>
                                <Switch
                                  id="can_teach_online"
                                  name="can_teach_online"
                                  checked={formData.can_teach_online || false}
                                  onCheckedChange={(checked) => setFormData({...formData, can_teach_online: checked})}
                                />
                              </div>

                              <div className="flex items-center gap-4">
                                <Label htmlFor="can_travel" className="flex-1">Available for Travel</Label>
                                <Switch
                                  id="can_travel"
                                  name="can_travel"
                                  checked={formData.can_travel || false}
                                  onCheckedChange={(checked) => setFormData({...formData, can_travel: checked})}
                                />
                              </div>

                              {formData.can_travel && (
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="travel_radius">Travel Radius (km)</Label>
                                  <Input
                                    id="travel_radius"
                                    name="travel_radius"
                                    type="number"
                                    value={formData.travel_radius || 0}
                                    onChange={handleChange}
                                    min="0"
                                  />
                                </div>
                              )}

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="availability_status">Availability Status</Label>
                                <select
                                  id="availability_status"
                                  name="availability_status"
                                  value={formData.availability_status || 'UNAVAILABLE'}
                                  onChange={handleChange}
                                  className="rounded-md border border-input bg-background px-3 py-2"
                                >
                                  <option value="AVAILABLE">Available</option>
                                  <option value="BUSY">Busy</option>
                                  <option value="UNAVAILABLE">Unavailable</option>
                                </select>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {userData.user_type === 'STUDENT' && (
                          <Card className="col-span-1 md:col-span-3">
                            <CardHeader>
                              <CardTitle>Student Profile</CardTitle>
                              <CardDescription>Update your student-specific information</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="grade">Grade</Label>
                                <Input
                                  id="grade"
                                  name="grade"
                                  value={formData.grade || ''}
                                  onChange={handleChange}
                                  placeholder="Current Grade"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="section">Section</Label>
                                <Input
                                  id="section"
                                  name="section"
                                  value={formData.section || ''}
                                  onChange={handleChange}
                                  placeholder="Section"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="roll_number">Roll Number</Label>
                                <Input
                                  id="roll_number"
                                  name="roll_number"
                                  value={formData.roll_number || ''}
                                  onChange={handleChange}
                                  placeholder="Roll Number"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="date_of_birth">Date of Birth</Label>
                                <Input
                                  id="date_of_birth"
                                  name="date_of_birth"
                                  type="date"
                                  value={formData.date_of_birth || ''}
                                  onChange={handleChange}
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                                <Input
                                  id="parent_name"
                                  name="parent_name"
                                  value={formData.parent_name || ''}
                                  onChange={handleChange}
                                  placeholder="Parent/Guardian Name"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="parent_phone">Parent/Guardian Phone</Label>
                                <Input
                                  id="parent_phone"
                                  name="parent_phone"
                                  value={formData.parent_phone || ''}
                                  onChange={handleChange}
                                  placeholder="Parent/Guardian Phone"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="parent_email">Parent/Guardian Email</Label>
                                <Input
                                  id="parent_email"
                                  name="parent_email"
                                  type="email"
                                  value={formData.parent_email || ''}
                                  onChange={handleChange}
                                  placeholder="Parent/Guardian Email"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {(userData.user_type === 'SCHOOL_ADMIN' || userData.user_type === 'PRINCIPAL') && (
                          <Card className="col-span-1 md:col-span-3">
                            <CardHeader>
                              <CardTitle>Staff Profile</CardTitle>
                              <CardDescription>Update your staff-specific information</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                  id="department"
                                  name="department"
                                  value={formData.department || ''}
                                  onChange={handleChange}
                                  placeholder="Department"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="employee_id">Employee ID</Label>
                                <Input
                                  id="employee_id"
                                  name="employee_id"
                                  value={formData.employee_id || ''}
                                  onChange={handleChange}
                                  placeholder="Employee ID"
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="joining_date">Date of Joining</Label>
                                <Input
                                  id="joining_date"
                                  name="joining_date"
                                  type="date"
                                  value={formData.joining_date || ''}
                                  onChange={handleChange}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <div className="col-span-1 md:col-span-3">
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </TabsContent>

                  {userData.user_type === 'SCHOOL_ADMIN' && (
                    <TabsContent value="school">
                      <form onSubmit={handleSubmit}>
                        <Card>
                          <CardHeader>
                            <CardTitle>School Profile</CardTitle>
                            <CardDescription>Update your school's information</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="school_name">School Name</Label>
                              <Input
                                id="school_name"
                                name="school_name"
                                value={formData.school_name || ''}
                                onChange={handleChange}
                                placeholder="School Name"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="category">School Category</Label>
                              <select
                                id="category"
                                name="category"
                                value={formData.category || ''}
                                onChange={handleChange}
                                className="rounded-md border border-input bg-background px-3 py-2"
                              >
                                <option value="">Select Category</option>
                                <option value="PRIMARY">Primary School</option>
                                <option value="MIDDLE">Middle School</option>
                                <option value="SECONDARY">Secondary School</option>
                                <option value="HIGHER_SECONDARY">Higher Secondary School</option>
                                <option value="DEGREE_COLLEGE">Degree College</option>
                                <option value="UNIVERSITY">University</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="board_type">Board Type</Label>
                              <select
                                id="board_type"
                                name="board_type"
                                value={formData.board_type || ''}
                                onChange={handleChange}
                                className="rounded-md border border-input bg-background px-3 py-2"
                              >
                                <option value="">Select Board</option>
                                <option value="CBSE">CBSE</option>
                                <option value="ICSE">ICSE</option>
                                <option value="IB">IB</option>
                                <option value="STATE">State Board</option>
                                <option value="OTHER">Other Board</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                              <Label htmlFor="address">School Address</Label>
                              <Textarea
                                id="address"
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                placeholder="School Address"
                                className="h-24"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                name="city"
                                value={formData.city || ''}
                                onChange={handleChange}
                                placeholder="City"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="state">State</Label>
                              <Input
                                id="state"
                                name="state"
                                value={formData.state || ''}
                                onChange={handleChange}
                                placeholder="State"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="country">Country</Label>
                              <Input
                                id="country"
                                name="country"
                                value={formData.country || ''}
                                onChange={handleChange}
                                placeholder="Country"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="postal_code">Postal Code</Label>
                              <Input
                                id="postal_code"
                                name="postal_code"
                                value={formData.postal_code || ''}
                                onChange={handleChange}
                                placeholder="Postal Code"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="website">Website</Label>
                              <Input
                                id="website"
                                name="website"
                                type="url"
                                value={formData.website || ''}
                                onChange={handleChange}
                                placeholder="https://example.com"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="contact_person">Contact Person</Label>
                              <Input
                                id="contact_person"
                                name="contact_person"
                                value={formData.contact_person || ''}
                                onChange={handleChange}
                                placeholder="Contact Person"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="registration_number">Registration Number</Label>
                              <Input
                                id="registration_number"
                                name="registration_number"
                                value={formData.registration_number || ''}
                                onChange={handleChange}
                                placeholder="Registration Number"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor="established_year">Established Year</Label>
                              <Input
                                id="established_year"
                                name="established_year"
                                type="number"
                                min="1800"
                                max={new Date().getFullYear()}
                                value={formData.established_year || ''}
                                onChange={handleChange}
                                placeholder="Established Year"
                              />
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" /> Save School Profile
                                </>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      </form>
                    </TabsContent>
                  )}

                  {userData.user_type === 'SCHOOL_ADMIN' && (
                    <TabsContent value="algorithm">
                      <Card>
                        <CardHeader>
                          <CardTitle>Matching Algorithm Settings</CardTitle>
                          <CardDescription>Customize how teachers are matched with substitution requests</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="batch_size">Batch Size</Label>
                            <div className="grid gap-2">
                              <Input
                                id="batch_size"
                                type="number"
                                min="1"
                                max="50"
                                value={algorithmSettings.batch_size.toString()}
                                onChange={(e) => {
                                  handleAlgorithmSettingChange('batch_size', parseInt(e.target.value));
                                }}
                                onBlur={() => updateAlgorithmSettings(algorithmSettings)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Number of teachers to consider in each batch for substitution requests.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label htmlFor="wait_time">Wait Time (minutes)</Label>
                            <div className="grid gap-2">
                              <Input
                                id="wait_time"
                                type="number"
                                min="1"
                                max="1440"
                                value={algorithmSettings.wait_time_minutes.toString()}
                                onChange={(e) => {
                                  handleAlgorithmSettingChange('wait_time_minutes', parseInt(e.target.value));
                                }}
                                onBlur={() => updateAlgorithmSettings(algorithmSettings)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Time to wait for teacher responses before inviting the next batch.
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-4">Weighting Factors</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                              Adjust how much importance is given to each factor when matching teachers.
                              Higher values mean the factor has more influence on teacher selection.
                            </p>

                            <div className="grid gap-8">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                  <Label htmlFor="experience_weight">Experience Weight</Label>
                                  <span>{algorithmSettings.experience_weight}</span>
                                </div>
                                <Slider
                                  id="experience_weight"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[algorithmSettings.experience_weight]}
                                  onValueChange={(value) => {
                                    handleAlgorithmSettingChange('experience_weight', value[0]);
                                  }}
                                  onValueCommit={(value) => {
                                    updateAlgorithmSettings({
                                      ...algorithmSettings,
                                      experience_weight: value[0]
                                    })
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Importance of teacher's years of experience.
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                  <Label htmlFor="rating_weight">Rating Weight</Label>
                                  <span>{algorithmSettings.rating_weight}</span>
                                </div>
                                <Slider
                                  id="rating_weight"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[algorithmSettings.rating_weight]}
                                  onValueChange={(value) => {
                                    handleAlgorithmSettingChange('rating_weight', value[0]);
                                  }}
                                  onValueCommit={(value) => {
                                    updateAlgorithmSettings({
                                      ...algorithmSettings,
                                      rating_weight: value[0]
                                    })
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Importance of teacher's performance rating.
                                </p>
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                  <Label htmlFor="distance_weight">Distance Weight</Label>
                                  <span>{algorithmSettings.distance_weight}</span>
                                </div>
                                <Slider
                                  id="distance_weight"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[algorithmSettings.distance_weight]}
                                  onValueChange={(value) => {
                                    handleAlgorithmSettingChange('distance_weight', value[0]);
                                  }}
                                  onValueCommit={(value) => {
                                    updateAlgorithmSettings({
                                      ...algorithmSettings,
                                      distance_weight: value[0]
                                    })
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Importance of teacher's proximity to the school.
                                </p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-4">Qualification Weights</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                              Adjust the weight given to different qualification levels.
                            </p>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="flex flex-col gap-2">
                                <Label htmlFor="weight_phd">PhD Weight</Label>
                                <Input
                                  id="weight_phd"
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={algorithmSettings.weights.qualification.PhD.toString()}
                                  onChange={(e) => {
                                    handleAlgorithmSettingChange('weights.qualification.PhD', parseInt(e.target.value));
                                  }}
                                  onBlur={() => updateAlgorithmSettings(algorithmSettings)}
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="weight_masters">Masters Weight</Label>
                                <Input
                                  id="weight_masters"
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={algorithmSettings.weights.qualification.Masters.toString()}
                                  onChange={(e) => {
                                    handleAlgorithmSettingChange('weights.qualification.Masters', parseInt(e.target.value));
                                  }}
                                  onBlur={() => updateAlgorithmSettings(algorithmSettings)}
                                />
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label htmlFor="weight_bachelors">Bachelors Weight</Label>
                                <Input
                                  id="weight_bachelors"
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={algorithmSettings.weights.qualification.Bachelors.toString()}
                                  onChange={(e) => {
                                    handleAlgorithmSettingChange('weights.qualification.Bachelors', parseInt(e.target.value));
                                  }}
                                  onBlur={() => updateAlgorithmSettings(algorithmSettings)}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>

      <SidebarRight userData={userData ? {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        avatar: userData.profile_image || "/avatars/shadcn.jpg"
      } : undefined} />
    </SidebarProvider>
  )
}