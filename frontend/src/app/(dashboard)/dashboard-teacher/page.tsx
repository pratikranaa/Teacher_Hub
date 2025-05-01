"use client"

import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { BASE_API_URL } from "@/lib/config"
import { AvailabilityForm } from "@/components/dashboard/AvailabilityForm"
import { CreateRequestForm } from "@/components/dashboard/CreateRequestForm"
import { PendingRequestsTable } from "./components/pending-requests-table"
import { RequestHistoryTable } from "./components/request-history-table"
import { RejectedRequestsTable } from "./components/rejected-requests-table"
import { CreatedRequestsTable } from "./components/created-requests-table"
import { acceptSubstituteRequest, declineSubstituteRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/hooks/use-userdata"
import { TeacherNotificationCenter } from "./components/notification-center"


export default function Page() {
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestHistory, setRequestHistory] = useState([])
  const [rejectedRequests, setRejectedRequests] = useState([])
  const [createdRequests, setCreatedRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { userData, isLoading: userLoading } = useUserData()
  
  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const created_response = await fetch(`${BASE_API_URL}/api/substitute-requests/my_requests`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      })
      
      if (!created_response.ok) throw new Error("Failed to fetch requests")
      const created_data = await created_response.json()

      const invited_response = await fetch(`${BASE_API_URL}/api/substitute-requests/requests_to_me`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      } )
      if (!invited_response.ok) throw new Error("Failed to fetch requests")

      const invited_data = await invited_response.json()

      
      // Filter requests based on status
      const pending = invited_data.filter(req => req.status === 'AWAITING_ACCEPTANCE')
      const history = invited_data.filter(req => ['ASSIGNED', 'COMPLETED'].includes(req.status))
      const rejected = invited_data.filter(req => req.status === 'CANCELLED')
      
      // Requests created by the current teacher
      const created = created_data
      
      setPendingRequests(pending)
      setRejectedRequests(rejected)
      setRequestHistory(history)
      setCreatedRequests(created)
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptSubstituteRequest(requestId)
      toast({
        title: "Success",
        description: "You have accepted the request.",
      })
      fetchRequests()
    } catch (error) {
      console.error("Error accepting request:", error)
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeclineRequest = async (requestId, note) => {
    try {
      await declineSubstituteRequest(requestId, note)
      toast({
        title: "Success",
        description: "You have declined the request.",
      })
      fetchRequests()
    } catch (error) {
      console.error("Error declining request:", error)
      toast({
        title: "Error",
        description: "Failed to decline request. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1 text-3xl font-bold">
                    {userLoading ? "Loading..." : `Welcome, ${userData?.first_name || userData?.username}`}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
            <TeacherNotificationCenter />
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4">

          <div className="mx-auto w-full max-w-6xl rounded-xl bg-muted/5 p-6">
            
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
               
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Create Request</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Create a New Request</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <CreateRequestForm onSuccess={() => fetchRequests()} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Tabs defaultValue="created">
              <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="created">Created Requests</TabsTrigger>
                <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                <TabsTrigger value="history">Accepted Requests</TabsTrigger>
                <TabsTrigger value="rejected">Rejected Requests</TabsTrigger>
              </TabsList>

              <TabsContent value="created">
                <CreatedRequestsTable 
                  data={createdRequests} 
                  isLoading={isLoading} 
                  onRefresh={fetchRequests}
                />
              </TabsContent>
              
              <TabsContent value="pending">
                <PendingRequestsTable 
                  data={pendingRequests} 
                  isLoading={isLoading} 
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              </TabsContent>
              
              <TabsContent value="history">
                <RequestHistoryTable 
                  data={requestHistory} 
                  isLoading={isLoading} 
                />
              </TabsContent>
              
              <TabsContent value="rejected">
                <RejectedRequestsTable 
                  data={rejectedRequests} 
                  isLoading={isLoading} 
                />
              </TabsContent>
            </Tabs>
            
            <div className="mt-6">
              <AvailabilityForm />
            </div>
          </div>
        </div>
      </SidebarInset>
      {/* Pass the dynamic user data to SidebarRight */}
      <SidebarRight userData={userData ? {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        avatar: userData.profile_image || "/avatars/shadcn.jpg"
      } : undefined} />
    </SidebarProvider>
  )
}