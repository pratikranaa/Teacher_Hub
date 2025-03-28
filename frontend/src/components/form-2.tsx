"use client"

import React, { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Helper to get userData from cookie
function getUserDataFromCookie() {
  const cookieStr = document.cookie
    .split("; ")
    .find(row => row.startsWith("userData="))
  if (cookieStr) {
    try {
      const data = JSON.parse(cookieStr.split("=")[1])
      return data
    } catch (error) {
      console.error("Error parsing userData cookie", error)
    }
  }
  return null
}

type FilePreview = {
  file: File
  preview: string
}

type FormField = {
  type: string
  label: string
  required: boolean
  order: number
  section?: string
  options?: Array<{value: string, label: string}>
  min?: number
  max?: number
  accept?: string
  max_size?: number
}

interface UserData {
  userType: "INTERNAL_TEACHER" | "EXTERNAL_TEACHER" | "STUDENT" | "SCHOOL_ADMIN" | "PRINCIPAL"
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED"
  email: string
  userId: number
  username: string
  profileCompleted: boolean
}

interface ApiResponse {
  form_schema: Record<string, FormField>
  current_data: {
    first_name?: string
    last_name?: string
    phone_number?: string
    profile_image?: string
    teacher_profile?: Record<string, string | number | boolean>
    student_profile?: Record<string, string | number>
    school_staff_profile?: Record<string, string | number>
    school_profile?: Record<string, string | number>
  }
}

export function DynamicProfileForm() {
  const router = useRouter()
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [formSchema, setFormSchema] = useState<Record<string, FormField>>({})
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean | string[]>>({})
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [fileError, setFileError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sections, setSections] = useState<Set<string>>(new Set())

  // API base URL
  const API_BASE_URL = "http://127.0.0.1:8000"

  // Function to get auth token (add this)
  function getAuthToken() {
    // Try to get token from localStorage (most common approach)
    const token = localStorage.getItem('accessToken');
    if (token) return token;
  }
  
  // Then modify fetchFormData to include the token:
  const fetchFormData = async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/profile/completion/`, {
        credentials: 'include',
        headers
      });
      
      // Rest of the function...
      
      if (response.ok) {
        const data = await response.json() as ApiResponse
        
        if (data.form_schema && data.current_data) {
          setFormSchema(data.form_schema)
          
          // Extract sections
          const sectionSet = new Set<string>()
          Object.values(data.form_schema).forEach((field) => {
            if (field.section) {
              sectionSet.add(field.section)
            }
          })
          setSections(sectionSet)
          
          // Flatten the nested data structure to match form field paths
          const flattenedValues: Record<string, string | number | boolean | string[]> = {
            first_name: data.current_data.first_name || '',
            last_name: data.current_data.last_name || '',
            phone_number: data.current_data.phone_number || '',
          }
          
          // Handle teacher profile
          if (data.current_data.teacher_profile) {
            Object.entries(data.current_data.teacher_profile).forEach(([key, value]) => {
              if (key === 'subjects' || key === 'preferred_classes' || key === 'languages') {
                flattenedValues[`teacher_profile.${key}`] = typeof value === 'string' ? value.split(',') : []
              } else {
                flattenedValues[`teacher_profile.${key}`] = value
              }
            })
          }
          
          // Handle student profile
          if (data.current_data.student_profile) {
            Object.entries(data.current_data.student_profile).forEach(([key, value]) => {
              flattenedValues[`student_profile.${key}`] = value
            })
          }
          
          // Handle staff profile
          if (data.current_data.school_staff_profile) {
            Object.entries(data.current_data.school_staff_profile).forEach(([key, value]) => {
              flattenedValues[`school_staff_profile.${key}`] = value
            })
          }
          
          // Handle school profile
          if (data.current_data.school_profile) {
            Object.entries(data.current_data.school_profile).forEach(([key, value]) => {
              flattenedValues[`school_profile.${key}`] = value
            })
          }
          
          setFormValues(flattenedValues)
          
          // Set profile image if exists
          if (data.current_data.profile_image) {
            setFilePreview({
              file: new File([], 'profile-image'),
              preview: data.current_data.profile_image
            })
          }
        }
      } else {
        throw new Error(`Failed to fetch form data: ${response.status}`)
      }
    } catch (error) {
      console.error("Error fetching form data:", error)
      setErrors({ general: "Failed to load profile data. Please refresh the page or try again later." })
    }
  }
  
  // Load user data on mount
  useEffect(() => {
    const data = getUserDataFromCookie()
    if (data) {
      setUserData(data)
      fetchFormData()
    } else {
      setErrors({ general: "User session not found. Please log in again." })
    }
  }, [])
  
  // File change / drop handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    processFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  const processFile = (file: File | undefined) => {
    if (!file) return

    // Validate file size (200KB max)
    const maxSize = formSchema['profile_image']?.max_size || 200 * 1024
    if (file.size > maxSize) {
      setFileError(`File size exceeds ${maxSize/1024}KB limit`)
      setFilePreview(null)
      return
    }
    setFileError("")
    const reader = new FileReader()
    reader.onloadend = () => {
      setFilePreview({ file, preview: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // Generic change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    const isCheckbox = e.target.type === "checkbox"
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false
    
    setFormValues(prev => ({
      ...prev,
      [name]: isCheckbox ? checked : value,
    }))
  }

  // Handle multi-select fields
  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const items = value.split(",").map(item => item.trim()).filter(Boolean)
    setFormValues(prev => ({
      ...prev,
      [name]: items,
    }))
  }
  
  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)
    
    try {
      // Validate required fields
      const requiredFieldErrors: Record<string, string> = {}
      Object.entries(formSchema).forEach(([key, field]) => {
        if (field.required && !formValues[key]) {
          requiredFieldErrors[key] = `${field.label} is required`
        }
      })
      
      if (Object.keys(requiredFieldErrors).length > 0) {
        setErrors(requiredFieldErrors)
        setIsSubmitting(false)
        return
      }
      
      // Structure the data for submission
      const payload: Record<string, any> = {
        first_name: formValues.first_name,
        last_name: formValues.last_name,
        phone_number: formValues.phone_number,
      }
      
      // Build teacher profile data
      const teacherProfileData: Record<string, string | number | boolean> = {}
      Object.entries(formValues).forEach(([key, value]) => {
        if (key.startsWith('teacher_profile.')) {
          const fieldName = key.replace('teacher_profile.', '')
          
          // Convert arrays back to comma-separated strings
          if (Array.isArray(value)) {
            teacherProfileData[fieldName] = value.join(',')
          } else {
            teacherProfileData[fieldName] = value
          }
        }
      })
      
      if (Object.keys(teacherProfileData).length > 0) {
        payload.teacher_profile = teacherProfileData
      }
      
      // Build student profile data
      const studentProfileData: Record<string, string | number | boolean> = {}
      Object.entries(formValues).forEach(([key, value]) => {
        if (key.startsWith('student_profile.')) {
          const fieldName = key.replace('student_profile.', '')
          studentProfileData[fieldName] = value
        }
      })
      
      if (Object.keys(studentProfileData).length > 0) {
        payload.student_profile = studentProfileData
      }
      
      // Build staff profile data
      const staffProfileData: Record<string, string | number | boolean> = {}
      Object.entries(formValues).forEach(([key, value]) => {
        if (key.startsWith('school_staff_profile.')) {
          const fieldName = key.replace('school_staff_profile.', '')
          staffProfileData[fieldName] = value
        }
      })
      
      if (Object.keys(staffProfileData).length > 0) {
        payload.school_staff_profile = staffProfileData
      }
      
      // Build school profile data
      const schoolProfileData: Record<string, string | number | boolean> = {}
      Object.entries(formValues).forEach(([key, value]) => {
        if (key.startsWith('school_profile.')) {
          const fieldName = key.replace('school_profile.', '')
          schoolProfileData[fieldName] = value
        }
      })
      
      if (Object.keys(schoolProfileData).length > 0) {
        payload.school_profile = schoolProfileData
      }
      
      // Handle profile image
      if (filePreview?.file && filePreview.file.name !== 'profile-image') {
        const imageFormData = new FormData()
        imageFormData.append('profile_image', filePreview.file)
        
        const imageResponse = await fetch(`${API_BASE_URL}/api/profile/image/`, {
          method: 'POST',
          body: imageFormData,
          credentials: 'include'
        })
        
        if (!imageResponse.ok) {
          throw new Error('Failed to upload profile image')
        }
      }
      




        // In handleSubmit function:
        const token = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Submit form data
        const response = await fetch(`${API_BASE_URL}/api/profile/completion/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      
      if (!response.ok) {
        const errorData = await response.json()
        if (typeof errorData === 'object') {
          setErrors(errorData)
        } else {
          setErrors({ general: 'An error occurred during submission' })
        }
        return
      }
      
      const result = await response.json()
      
      if (result.verification_status === 'PENDING') {
        router.push('/verification-pending')
      } else {
        // Redirect based on user type
        if (userData?.userType === 'STUDENT') {
          router.push('/dashboard-student')
        } else if (userData?.userType === 'INTERNAL_TEACHER' || userData?.userType === 'EXTERNAL_TEACHER') {
          router.push('/dashboard-teacher')
        } else if (userData?.userType === 'SCHOOL_ADMIN' || userData?.userType === 'PRINCIPAL') {
          router.push('/dashboard-school')
        }
      }
    } catch (error) {
      console.error('Profile submission error:', error)
      setErrors({ general: 'Network or server error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Get field error
  const getFieldError = (fieldName: string): string | null => {
    if (errors[fieldName]) return errors[fieldName]
    return null
  }
  
  // Render form fields
  const renderFormField = (key: string, field: FormField) => {
    const value = formValues[key] || ''
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'url':
        return (
          <div className="grid gap-2" key={key}>
            <Label htmlFor={key}>{field.label} {field.required ? '*' : ''}</Label>
            <Input
              id={key}
              name={key}
              type={field.type}
              value={value.toString()}
              onChange={handleChange}
              min={field.min}
              max={field.max}
              required={field.required}
            />
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'textarea':
        return (
          <div className="grid gap-2" key={key}>
            <Label htmlFor={key}>{field.label} {field.required ? '*' : ''}</Label>
            <textarea
              id={key}
              name={key}
              value={value.toString()}
              onChange={handleChange}
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              required={field.required}
            />
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'select':
        return (
          <div className="grid gap-2" key={key}>
            <Label htmlFor={key}>{field.label} {field.required ? '*' : ''}</Label>
            <select
              id={key}
              name={key}
              value={value.toString()}
              onChange={handleChange}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'checkbox':
        return (
          <div className="flex items-center gap-2" key={key}>
            <Input
              type="checkbox"
              id={key}
              name={key}
              checked={value === true}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <Label htmlFor={key} className="text-sm font-medium">{field.label}</Label>
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'date':
        return (
          <div className="grid gap-2" key={key}>
            <Label htmlFor={key}>{field.label} {field.required ? '*' : ''}</Label>
            <Input
              id={key}
              name={key}
              type="date"
              value={value.toString()}
              onChange={handleChange}
              required={field.required}
            />
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'multi-text':
        return (
          <div className="grid gap-2" key={key}>
            <Label htmlFor={key}>{field.label} {field.required ? '*' : ''} (comma separated)</Label>
            <Input
              id={key}
              name={key}
              value={Array.isArray(value) ? value.join(", ") : value.toString()}
              onChange={handleMultiSelectChange}
              required={field.required}
            />
            {getFieldError(key) && (
              <p className="text-red-500 text-sm">{getFieldError(key)}</p>
            )}
          </div>
        )
        
      case 'file':
        return (
          <div className="grid gap-2" key={key}>
            <Label>{field.label} {field.required ? '*' : ''} (Max {field.max_size ? field.max_size/1024 : 200}KB)</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border border-dashed p-4 flex items-center justify-center cursor-pointer relative rounded-md hover:bg-muted/50 transition-colors"
            >
              {filePreview ? (
                <img
                  src={filePreview.preview}
                  alt="Profile Preview"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
              )}
              <input
                type="file"
                accept={field.accept || "image/*"}
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
            </div>
            {fileError && (
              <p className="text-red-500 text-sm">{fileError}</p>
            )}
          </div>
        )
        
      default:
        return null
    }
  }
  
  // Get sorted fields
  const getSortedFields = () => {
    return Object.entries(formSchema)
      .sort((a, b) => a[1].order - b[1].order)
  }
  
  // Get fields by section
  const getFieldsBySection = (sectionName: string) => {
    return getSortedFields()
      .filter(([_, field]) => field.section === sectionName)
      .map(([key, field]) => renderFormField(key, field))
  }
  
  // Get base fields (without section)
  const getBaseFields = () => {
    return getSortedFields()
      .filter(([_, field]) => !field.section)
      .map(([key, field]) => renderFormField(key, field))
  }
  
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill out the form below to complete your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errors.general && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {errors.general}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* Base Fields */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  value={userData?.email || ""}
                  disabled={true}
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              
              {/* Render dynamic base fields */}
              {getBaseFields()}
              
              {/* Render sections */}
              {Array.from(sections).map((section) => (
                <div key={section}>
                  <div className="mt-6 mb-4">
                    <h3 className="font-medium text-lg">{section}</h3>
                    <div className="h-px bg-gray-200 my-2"></div>
                  </div>
                  {getFieldsBySection(section)}
                </div>
              ))}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Complete Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-muted-foreground mt-2">
        By clicking submit, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  )
}