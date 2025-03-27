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


const BASEURL = "http://localhost:8000"


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

export function ProfileCompletionForm() {
  const router = useRouter()
  interface UserData {
    userType: "INTERNAL_TEACHER" | "EXTERNAL_TEACHER" | "STUDENT" | "SCHOOL_ADMIN" | "PRINCIPAL";
    verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
    email: string;
    userId: number;
    username: string;
    profileCompleted: boolean;
  }

  
  const [userData, setUserData] = useState<UserData | null>(null)
  interface FormData {
    firstName: string
    lastName: string
    phoneNumber: string
    address: string
    // Teacher fields
    educationalQualification: string
    teachingSubjects: string[]
    yearsOfExperience: string
    preferredClasses: string[]
    teachingMethodology: string
    languagesKnown: string[]
    availableOnline: boolean
    availableTravel: boolean
    // Student fields
    currentGrade: string
    section: string
    rollNumber: string
    parentName: string
    parentPhone: string
    parentEmail: string
    dateOfBirth: string
    // School staff fields
    department: string
    employeeId: string
    dateOfJoining: string
    // School fields (for admin/principal)
    schoolName: string
    schoolCategory: string
    schoolAddress: string
    schoolCity: string
    schoolState: string
    schoolCountry: string
    schoolPostalCode: string
    schoolWebsite: string
    schoolContactPerson: string
    schoolBoardType: string
    schoolRegistrationNumber: string
    schoolEstablishedYear: string
  }

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
    educationalQualification: "",
    teachingSubjects: [],
    yearsOfExperience: "",
    preferredClasses: [],
    teachingMethodology: "",
    languagesKnown: [],
    availableOnline: false,
    availableTravel: false,
    currentGrade: "",
    section: "",
    rollNumber: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    dateOfBirth: "",
    department: "",
    employeeId: "",
    dateOfJoining: "",
    schoolName: "",
    schoolCategory: "",
    schoolAddress: "",
    schoolCity: "",
    schoolState: "",
    schoolCountry: "",
    schoolPostalCode: "",
    schoolWebsite: "",
    schoolContactPerson: "",
    schoolBoardType: "",
    schoolRegistrationNumber: "",
    schoolEstablishedYear: "",
  })


    const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [fileError, setFileError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)


  // Read cookie on mount
  useEffect(() => {
    const data = getUserDataFromCookie()
    if (data) {
      setUserData(data)
    }
  }, [])


    // Update the fetchUserData function to handle nested profile data
    const fetchUserData = async () => {
      try {
        const response = await fetch(BASEURL+'api/profile/completion/', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.current_data) {
            const userData = data.current_data
            
            const newFormData = {
              ...formData,
              firstName: userData.first_name || '',
              lastName: userData.last_name || '',
              phoneNumber: userData.phone_number || '',
              address: userData.address || '',
            }
            
            // Handle teacher profile data
            if (userData.teacher_profile) {
              newFormData.educationalQualification = userData.teacher_profile.qualification || '';
              newFormData.teachingSubjects = userData.teacher_profile.subjects?.split(',') || [];
              newFormData.yearsOfExperience = userData.teacher_profile.experience_years || '';
              newFormData.preferredClasses = userData.teacher_profile.preferred_classes?.split(',') || [];
              newFormData.teachingMethodology = userData.teacher_profile.teaching_methodology || '';
              newFormData.languagesKnown = userData.teacher_profile.languages?.split(',') || [];
              newFormData.availableOnline = userData.teacher_profile.can_teach_online || false;
              newFormData.availableTravel = userData.teacher_profile.can_travel || false;
            }
            
            // Handle student profile data
            if (userData.student_profile) {
              newFormData.currentGrade = userData.student_profile.grade || '';
              newFormData.section = userData.student_profile.section || '';
              newFormData.rollNumber = userData.student_profile.roll_number || '';
              newFormData.parentName = userData.student_profile.parent_name || '';
              newFormData.parentPhone = userData.student_profile.parent_phone || '';
              newFormData.parentEmail = userData.student_profile.parent_email || '';
              newFormData.dateOfBirth = userData.student_profile.date_of_birth || '';
            }
            
            // Handle school staff profile data
            if (userData.school_staff_profile) {
              newFormData.department = userData.school_staff_profile.department || '';
              newFormData.employeeId = userData.school_staff_profile.employee_id || '';
              newFormData.dateOfJoining = userData.school_staff_profile.date_of_joining || '';
            }

            // Handle school data for admin/principal
if (userData.user_type === 'SCHOOL_ADMIN' || userData.user_type === 'PRINCIPAL' || userData.user_type === 'INTERNAL_TEACHER' || userData.user_type === 'EXTERNAL_TEACHER') {
  // Get school data either from school_profile or from school_staff.school
  const schoolData = userData.school_profile || 
    (userData.school_staff_profile && userData.school_staff_profile.school);
  
  if (schoolData) {
    newFormData.schoolName = schoolData.school_name || '';
    newFormData.schoolCategory = schoolData.category || '';
    newFormData.schoolAddress = schoolData.address || '';
    newFormData.schoolCity = schoolData.city || '';
    newFormData.schoolState = schoolData.state || '';
    newFormData.schoolCountry = schoolData.country || '';
    newFormData.schoolPostalCode = schoolData.postal_code || '';
    newFormData.schoolWebsite = schoolData.website || '';
    newFormData.schoolContactPerson = schoolData.contact_person || '';
    newFormData.schoolBoardType = schoolData.board_type || '';
    newFormData.schoolRegistrationNumber = schoolData.registration_number || '';
    newFormData.schoolEstablishedYear = schoolData.established_year?.toString() || '';
  }
}  
            setFormData(newFormData);
            
            // Set profile image if exists
            if (userData.profile_image) {
              setFilePreview({
                file: new File([], 'profile-image'),
                preview: userData.profile_image
              })
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }
  
  // Update the useEffect to call this function
  useEffect(() => {
    const data = getUserDataFromCookie()
    if (data) {
      setUserData(data)
      fetchUserData()
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
    if (file.size > 200 * 1024) { // 200KB limit
      setFileError("File size exceeds 200KB limit")
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
    
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: isCheckbox ? checked : value,
    }))
  }

  // Handle multi-select fields (simulate with comma-separated input for this demo)
  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const items = value.split(",").map(item => item.trim())
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: items,
    }))
  }

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    // Validate required fields (base fields for all users)
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      alert("Please fill in all required base fields")
      return
    }
    // Additional validation for user-specific fields
    if (userData) {
      if (
        (userData.userType === "INTERNAL_TEACHER" ||
          userData.userType === "EXTERNAL_TEACHER") &&
        (!formData.educationalQualification ||
          formData.teachingSubjects.length === 0 ||
          !formData.yearsOfExperience)
      ) {
        alert("Please complete all required teacher fields")
        return
      }
      if (
        userData.userType === "STUDENT" &&
        (!formData.currentGrade ||
          !formData.parentName ||
          !formData.parentPhone)
      ) {
        alert("Please complete all required student fields")
        return
      }
      // Inside handleSubmit, in the validation section for SCHOOL_ADMIN or PRINCIPAL
      if (
        (userData.userType === "SCHOOL_ADMIN" ||
          userData.userType === "PRINCIPAL") &&
        (!formData.department || !formData.employeeId || !formData.dateOfJoining ||
         !formData.schoolName || !formData.schoolCategory || !formData.schoolAddress || 
         !formData.schoolCity || !formData.schoolState || !formData.schoolCountry ||
         !formData.schoolPostalCode || !formData.schoolBoardType || 
         !formData.schoolRegistrationNumber || !formData.schoolEstablishedYear)
      ) {
        alert("Please complete all required school and staff fields")
        setIsSubmitting(false)
        return
      }
    }
      
    try {
      // Create a structured JSON payload that matches Django's expectations
      interface ProfileJsonData {
        first_name: string;
        last_name: string;
        phone_number: string;
        address: string;
        teacher_profile?: {
          qualification: string;
          subjects: string;
          experience_years: string;
          preferred_classes: string;
          teaching_methodology: string;
          languages: string;
          can_teach_online: boolean;
          can_travel: boolean;
        };
        student_profile?: {
          grade: string;
          section: string;
          roll_number: string;
          parent_name: string;
          parent_phone: string;
          parent_email: string;
          date_of_birth: string;
        };
        school_staff_profile?: {
          department: string;
          employee_id: string;
          date_of_joining: string;
        };
        school_profile?: {
          school_name: string;
          category: string;
          address: string;
          city: string;
          state: string;
          country: string;
          postal_code: string;
          website: string;
          contact_person: string;
          board_type: string;
          registration_number: string;
          established_year: string;
        };
      }
      
      const jsonData: ProfileJsonData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        address: formData.address || ''
      }
        
    // Add user type specific fields as nested objects
    if (userData?.userType === 'INTERNAL_TEACHER' || userData?.userType === 'EXTERNAL_TEACHER') {
      jsonData.teacher_profile = {
        qualification: formData.educationalQualification,
        subjects: formData.teachingSubjects.join(','),
        experience_years: formData.yearsOfExperience,
        preferred_classes: formData.preferredClasses.join(','),
        teaching_methodology: formData.teachingMethodology || '',
        languages: formData.languagesKnown.join(','),
        can_teach_online: formData.availableOnline,
        can_travel: formData.availableTravel
      }
    } 
    else if (userData?.userType === 'STUDENT') {
      jsonData.student_profile = {
        grade: formData.currentGrade,
        section: formData.section || '',
        roll_number: formData.rollNumber || '',
        parent_name: formData.parentName,
        parent_phone: formData.parentPhone,
        parent_email: formData.parentEmail || '',
        date_of_birth: formData.dateOfBirth || ''
      }
    }
        else if (userData?.userType === 'SCHOOL_ADMIN' || userData?.userType === 'PRINCIPAL') {
          jsonData.school_staff_profile = {
            department: formData.department,
            employee_id: formData.employeeId,
            date_of_joining: formData.dateOfJoining
          }
          
          jsonData.school_profile = {
            school_name: formData.schoolName,
            category: formData.schoolCategory,
            address: formData.schoolAddress,
            city: formData.schoolCity,
            state: formData.schoolState,
            country: formData.schoolCountry,
            postal_code: formData.schoolPostalCode,
            website: formData.schoolWebsite || '',
            contact_person: formData.schoolContactPerson,
            board_type: formData.schoolBoardType,
            registration_number: formData.schoolRegistrationNumber,
            established_year: formData.schoolEstablishedYear
          }
        }
    
    // Handle profile image separately if needed
    if (filePreview?.file) {
      const imageFormData = new FormData()
      imageFormData.append('profile_image', filePreview.file)
      
      // First upload the image
      const imageResponse = await fetch(BASEURL + '/api/profile/image/', {
        method: 'POST',
        body: imageFormData,
        credentials: 'include'
      })
      
      if (!imageResponse.ok) {
        throw new Error('Failed to upload profile image')
      }
    }

    // Then submit the JSON data
    const response = await fetch(BASEURL + '/api/profile/completion/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData),
      credentials: 'include'
    })
    
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
    // Success handling...
        } catch (error) {
          console.error('Profile submission error:', error);
          setErrors({ general: 'Network or server error occurred' })
        } finally {
          setIsSubmitting(false)
        }
      }

// Add before your return statement
const getFieldError = (fieldName: string) => {
  // Check direct field errors
  if (errors[fieldName]) return errors[fieldName];
  
  // Check for snake_case equivalent
  const snakeCase = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  if (errors[snakeCase]) return errors[snakeCase];
  
  // Check for nested field errors
  const nestedPrefixes = ['teacher_profile.', 'student_profile.', 'school_staff_profile.', 'school_profile.'];
  for (const prefix of nestedPrefixes) {
    const key = `${prefix}${snakeCase}`;
    if (errors[key]) return errors[key];
  }
  
  return null;
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
            {/* Base Fields */}
            <div className="grid grid-cols-1 gap-6">
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
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              {/* Profile Image Upload */}
              <div className="grid gap-2">
                <Label>Profile Image (Max 200KB)</Label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border border-dashed p-4 flex items-center justify-center cursor-pointer relative"
                >
                  {filePreview ? (
                    <img
                      src={filePreview.preview}
                      alt="Profile Preview"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span>Click to upload</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                </div>
                {fileError && (
                  <p className="text-red-500 text-sm">{fileError}</p>
                )}
              </div>

              {/* Conditional Fields Based on User Type */}
              {userData &&
                (userData.userType === "INTERNAL_TEACHER" ||
                  userData.userType === "EXTERNAL_TEACHER") && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="educationalQualification">
                        Educational Qualification *
                      </Label>
                      <Input
                        id="educationalQualification"
                        name="educationalQualification"
                        value={formData.educationalQualification}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teachingSubjects">
                        Teaching Subjects * (comma separated)
                      </Label>
                      <Input
                        id="teachingSubjects"
                        name="teachingSubjects"
                        value={formData.teachingSubjects.join(", ")}
                        onChange={handleMultiSelectChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="yearsOfExperience">
                        Years of Experience *
                      </Label>
                      <Input
                        id="yearsOfExperience"
                        name="yearsOfExperience"
                        value={formData.yearsOfExperience}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preferredClasses">
                        Preferred Classes (comma separated)
                      </Label>
                      <Input
                        id="preferredClasses"
                        name="preferredClasses"
                        value={formData.preferredClasses.join(", ")}
                        onChange={handleMultiSelectChange}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teachingMethodology">
                        Teaching Methodology
                      </Label>
                      <textarea
                        id="teachingMethodology"
                        name="teachingMethodology"
                        value={formData.teachingMethodology}
                        onChange={handleChange}
                        className="border rounded p-2"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="languagesKnown">
                        Languages Known (comma separated)
                      </Label>
                      <Input
                        id="languagesKnown"
                        name="languagesKnown"
                        value={formData.languagesKnown.join(", ")}
                        onChange={handleMultiSelectChange}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        id="availableOnline"
                        name="availableOnline"
                        checked={formData.availableOnline}
                        onChange={handleChange}
                      />
                      <Label htmlFor="availableOnline">
                        Available for Online Teaching
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        id="availableTravel"
                        name="availableTravel"
                        checked={formData.availableTravel}
                        onChange={handleChange}
                      />
                      <Label htmlFor="availableTravel">
                        Available for Travel
                      </Label>
                    </div>
                  </>
                )}

              {userData && userData.userType === "STUDENT" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="currentGrade">
                      Current Grade *
                    </Label>
                    <Input
                      id="currentGrade"
                      name="currentGrade"
                      value={formData.currentGrade}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input
                      id="rollNumber"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parentName">
                      Parent/Guardian Name *
                    </Label>
                    <Input
                      id="parentName"
                      name="parentName"
                      value={formData.parentName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parentPhone">
                      Parent/Guardian Phone *
                    </Label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      value={formData.parentPhone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parentEmail">
                      Parent/Guardian Email
                    </Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      value={formData.parentEmail}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dateOfBirth">
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {userData &&
                (userData.userType === "SCHOOL_ADMIN" ||
                  userData.userType === "PRINCIPAL") && (
                  <>
                    {/* Staff details section */}
                    <div className="mt-6 mb-4">
                      <h3 className="font-medium text-lg">Staff Details</h3>
                      <div className="h-px bg-gray-200 my-2"></div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="department">Department *</Label>
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('department') && (
                        <p className="text-red-500 text-sm">{getFieldError('department')}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="employeeId">Employee ID *</Label>
                      <Input
                        id="employeeId"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('employee_id') && (
                        <p className="text-red-500 text-sm">{getFieldError('employee_id')}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                      <Input
                        id="dateOfJoining"
                        name="dateOfJoining"
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('date_of_joining') && (
                        <p className="text-red-500 text-sm">{getFieldError('date_of_joining')}</p>
                      )}
                    </div>
                    
                    {/* School details section */}
                    <div className="mt-6 mb-4">
                      <h3 className="font-medium text-lg">School Details</h3>
                      <div className="h-px bg-gray-200 my-2"></div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolName">School Name *</Label>
                      <Input
                        id="schoolName"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('school_name') && (
                        <p className="text-red-500 text-sm">{getFieldError('school_name')}</p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolCategory">School Category *</Label>
                      <select
                        id="schoolCategory"
                        name="schoolCategory"
                        value={formData.schoolCategory}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1"
                        required
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
                      {getFieldError('category') && (
                        <p className="text-red-500 text-sm">{getFieldError('category')}</p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolAddress">School Address *</Label>
                      <textarea
                        id="schoolAddress"
                        name="schoolAddress"
                        value={formData.schoolAddress}
                        onChange={handleChange}
                        className="border rounded p-2"
                        required
                      />
                      {getFieldError('address') && (
                        <p className="text-red-500 text-sm">{getFieldError('address')}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="schoolCity">City *</Label>
                        <Input
                          id="schoolCity"
                          name="schoolCity"
                          value={formData.schoolCity}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="schoolState">State *</Label>
                        <Input
                          id="schoolState"
                          name="schoolState"
                          value={formData.schoolState}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="schoolCountry">Country *</Label>
                        <Input
                          id="schoolCountry"
                          name="schoolCountry"
                          value={formData.schoolCountry}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="schoolPostalCode">Postal Code *</Label>
                        <Input
                          id="schoolPostalCode"
                          name="schoolPostalCode"
                          value={formData.schoolPostalCode}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolBoardType">Board Type *</Label>
                      <select
                        id="schoolBoardType"
                        name="schoolBoardType"
                        value={formData.schoolBoardType}
                        onChange={handleChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1"
                        required
                      >
                        <option value="">Select Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="IB">IB</option>
                        <option value="STATE">State Board</option>
                        <option value="OTHER">Other Board</option>
                      </select>
                      {getFieldError('board_type') && (
                        <p className="text-red-500 text-sm">{getFieldError('board_type')}</p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolRegistrationNumber">Registration Number *</Label>
                      <Input
                        id="schoolRegistrationNumber"
                        name="schoolRegistrationNumber"
                        value={formData.schoolRegistrationNumber}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('registration_number') && (
                        <p className="text-red-500 text-sm">{getFieldError('registration_number')}</p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolEstablishedYear">Established Year *</Label>
                      <Input
                        id="schoolEstablishedYear"
                        name="schoolEstablishedYear"
                        type="number"
                        min="1800"
                        max={new Date().getFullYear()}
                        value={formData.schoolEstablishedYear}
                        onChange={handleChange}
                        required
                      />
                      {getFieldError('established_year') && (
                        <p className="text-red-500 text-sm">{getFieldError('established_year')}</p>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolWebsite">Website</Label>
                      <Input
                        id="schoolWebsite"
                        name="schoolWebsite"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.schoolWebsite}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="schoolContactPerson">Contact Person *</Label>
                      <Input
                        id="schoolContactPerson"
                        name="schoolContactPerson"
                        value={formData.schoolContactPerson}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}
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

