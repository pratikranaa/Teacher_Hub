"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, CheckCircle, HelpCircle, Mail, MessageCircle, RefreshCw, X, ArrowLeft } from "lucide-react"
import { getUserData } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { BASE_API_URL } from "@/lib/config"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function VerificationRejectedPage() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  
  // Fetch user data and rejection reason on component mount
  useEffect(() => {
    const user = getUserData()
    setUserData(user)
    
    // Fetch rejection reason if available
    const fetchRejectionInfo = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        if (!token) return
        
        const response = await fetch(`${BASE_API_URL}/api/profile/`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        if (data.verification_notes) {
          setRejectionReason(data.verification_notes)
        } else {
          // Default reason if not provided by API
          setRejectionReason("Your profile information needs additional details or corrections.")
        }
      } catch (error) {
        console.error("Error fetching rejection info:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRejectionInfo()
  }, [])
  
  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) return
    
    setSubmitting(true)
    try {
      // This would typically send feedback to the server
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting feedback:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const contactSupport = () => {
    // Implement support contact functionality
    window.location.href = "mailto:support@teacherhub.com?subject=Profile Verification Assistance"
  }

  const goToProfileCompletion = () => {
    router.push('/profile-completion')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md md:max-w-2xl">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-700 mb-5">
              <X className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Verification Not Approved</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your profile verification was not approved at this time
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Verification Unsuccessful</AlertTitle>
              <AlertDescription>
                {rejectionReason || "Your profile information needs to be updated before it can be verified."}
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">What should I do next?</h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Update your profile information</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-4">
                      Review and update your profile information to address the issues mentioned. 
                      Make sure all required fields are completed accurately.
                    </p>
                    <Button onClick={goToProfileCompletion}>
                      Edit Profile Information
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>Contact your school admin</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Reach out to your school administrator for specific guidance about what needs to be corrected.
                      They can provide detailed feedback about why your verification was not approved.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>Request technical support</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-4">
                      If you're experiencing technical issues with the platform or need further assistance,
                      our support team is ready to help.
                    </p>
                    <Button variant="outline" onClick={contactSupport}>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support Team
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Separator className="my-4" />

            {!submitted ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Send Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  If you believe there's been an error or need clarification, please let us know:
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="feedback">Your Message</Label>
                  <Textarea 
                    id="feedback"
                    placeholder="Please provide any additional information or questions you have about your verification status..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <Button 
                  onClick={submitFeedback} 
                  className="w-full"
                  disabled={submitting || !feedbackMessage.trim()}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : "Send Feedback"}
                </Button>
              </div>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Feedback Sent</AlertTitle>
                <AlertDescription className="text-green-600">
                  Thank you for your feedback. Our team will review it and get back to you soon.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center pb-6">
            <Button 
              variant="outline" 
              className="flex w-full max-w-xs items-center justify-center gap-2"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          <p>Need immediate assistance? Call our support line at <span className="font-medium">1-800-TEACHER</span></p>
        </div>
      </div>
    </div>
  )
}