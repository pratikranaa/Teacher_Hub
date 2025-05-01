"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Clock, HelpCircle, Mail, MessageCircle, RefreshCw } from "lucide-react"
import { getUserData } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { BASE_API_URL } from "@/lib/config"

export default function VerificationPendingPage() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [submissionTime, setSubmissionTime] = useState<string | null>(null)
  const router = useRouter()
  
  // Fetch user data on component mount
  useEffect(() => {
    const user = getUserData()
    setUserData(user)
    
    // Set a mock submission time if not available
    // In a real app, this would come from the API
    if (!submissionTime) {
      const date = new Date()
      date.setHours(date.getHours() - Math.floor(Math.random() * 24))
      setSubmissionTime(date.toLocaleString())
    }
    
    setLoading(false)
  }, [submissionTime])
  
  const checkVerificationStatus = async () => {
    setCheckingStatus(true)
    try {
      const token = localStorage.getItem("accessToken")
      if (!token) {
        throw new Error("Authentication token not found")
      }
      
      const response = await fetch(`${BASE_API_URL}/api/profile/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to check status")
      }
      
      const data = await response.json()
      
      // If verified, redirect to dashboard
      if (data.profile_verification_status === 'VERIFIED') {
        // Update localStorage user data
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          verificationStatus: 'VERIFIED'
        }))
        
        // Redirect based on user type
        if (data.user_type === 'SCHOOL_ADMIN' || data.user_type === 'PRINCIPAL' || data.user_type === 'SCHOOL') {
          router.push('/dashboard-school')
        } else if (data.user_type === 'INTERNAL_TEACHER' || data.user_type === 'EXTERNAL_TEACHER' || data.user_type === 'TEACHER') {
          router.push('/dashboard-teacher')
        } else if (data.user_type === 'STUDENT') {
          router.push('/dashboard-student')
        } else {
          router.push('/dashboard')
        }
      } else if (data.profile_verification_status === 'REJECTED') {
        router.push('/verification-rejected')
      }
    } catch (error) {
      console.error("Error checking verification status:", error)
    } finally {
      setCheckingStatus(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md md:max-w-2xl">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 mb-5">
              <Clock className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Verification Pending</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              Your profile has been submitted successfully and is currently under review. 
              We typically complete verification within <strong>24-48 hours</strong>.
            </p>

            {submissionTime && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium text-muted-foreground">Submitted on: {submissionTime}</p>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">What happens next?</h3>
              <div className="grid gap-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">School Admin Review</p>
                    <p className="text-sm text-muted-foreground">Your school administrator will review your profile information</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Email Notification</p>
                    <p className="text-sm text-muted-foreground">You'll receive an email once your profile is verified</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Access Granted</p>
                    <p className="text-sm text-muted-foreground">Once verified, you'll get full access to the platform</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Need help?</h3>
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2" 
                  asChild
                >
                  <Link href="mailto:support@teacherhub.com">
                    <Mail className="h-4 w-4" />
                    <span>Contact Support</span>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  asChild
                >
                  <Link href="/faq">
                    <HelpCircle className="h-4 w-4" />
                    <span>FAQ</span>
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center pb-6">
            <Button 
              className="w-full max-w-xs" 
              onClick={checkVerificationStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Verification Status
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          <p>Not the right account? <Link href="/login" className="font-medium text-primary underline hover:text-primary/80">Sign in with a different account</Link></p>
        </div>
      </div>
    </div>
  )
}