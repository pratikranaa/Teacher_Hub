import { useState, useEffect } from "react"
import { BASE_API_URL } from "@/lib/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2Icon, CheckIcon, XIcon } from "lucide-react"

export function RequestDetailView({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${BASE_API_URL}/api/substitute-requests/${requestId}/`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
          }
        })
        if (!response.ok) throw new Error("Failed to fetch request details")
        const data = await response.json()
        setRequest(data)
      } catch (error) {
        console.error("Error fetching request details:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRequestDetails()
  }, [requestId])

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`${BASE_API_URL}/api/substitute-requests/${requestId}/accept_request/`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json"
        }
      })
      if (!response.ok) throw new Error("Failed to accept request")
      
      // Refresh request data
      const updatedResponse = await fetch(`${BASE_API_URL}/api/substitute-requests/${requestId}/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      })
      const updatedData = await updatedResponse.json()
      setRequest(updatedData)
    } catch (error) {
      console.error("Error accepting request:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    // Similar to handleAccept
  }

  if (isLoading) return <div className="flex justify-center p-6"><Loader2Icon className="animate-spin" /></div>

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Request {request.id}</CardTitle>
          <Badge variant={
            request.status === 'PENDING' ? 'outline' :
            request.status === 'ASSIGNED' ? 'success' :
            'destructive'
          }>
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({request.current_status?.total_invites || 0})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Subject</h4>
                  <p>{request.subject}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Grade & Section</h4>
                  <p>{request.grade}-{request.section}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Date</h4>
                  <p>{request.date}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Time</h4>
                  <p>{request.start_time} - {request.end_time}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Mode</h4>
                  <p>{request.mode}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Priority</h4>
                  <p>{request.priority}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold">Description</h4>
                <p>{request.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold">Requirements</h4>
                <p>{request.requirements}</p>
              </div>
              
              {request.status === 'PENDING' && (
                <div className="flex gap-2 justify-end mt-4">
                  <Button 
                    onClick={handleDecline}
                    variant="destructive"
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" /> : <XIcon className="h-4 w-4 mr-2" />}
                    Decline
                  </Button>
                  <Button 
                    onClick={handleAccept}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" /> : <CheckIcon className="h-4 w-4 mr-2" />}
                    Accept
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="invitations">
            <div className="space-y-4">
              {request.invitations?.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{invitation.teacher_details.name}</h4>
                        <p className="text-sm text-muted-foreground">Invited: {new Date(invitation.invited_at).toLocaleString()}</p>
                      </div>
                      <Badge>{invitation.status}</Badge>
                    </div>
                    {invitation.response_note && (
                      <div className="mt-2">
                        <p className="text-sm">{invitation.response_note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {(!request.invitations || request.invitations.length === 0) && (
                <p className="text-center text-muted-foreground py-6">No invitations yet</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="timeline">
            {/* Timeline implementation */}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}