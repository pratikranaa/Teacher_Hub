"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { getRequest, getInvitationHistory } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function RequestDetailDialog({ requestId, trigger, userRole }) {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const loadRequestDetails = async () => {
    if (!open || !requestId) return
    
    setLoading(true)
    try {
      const response = await getRequest(requestId)
      setRequest(response.data)
    } catch (error) {
      console.error("Failed to load request details", error)
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadRequestDetails()
  }, [open, requestId])
  
  const handleResponseAction = () => {
    loadRequestDetails()
  }
  
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "ASSIGNED": return "success"
      case "PENDING": return "warning"
      case "COMPLETED": return "default"
      case "CANCELLED": return "destructive"
      default: return "secondary"
    }
  }
  
  if (!request && open) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger(() => setOpen(true))}
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-40">
            Loading request details...
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <DialogContent className="max-w-2xl">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle>Request {request.id}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="invitations">Invitations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Assigned Teacher</h3>
                    <p>{request.assigned_teacher_details?.name || "Not assigned"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Subject</h3>
                    <p>{request.subject}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Grade & Section</h3>
                    <p>{request.grade} {request.section}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Date & Time</h3>
                    <p>{request.date}, {request.start_time} - {request.end_time}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Mode</h3>
                    <p>{request.mode}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <h3 className="font-semibold">Description</h3>
                    <p>{request.description}</p>
                  </div>
                  
                  {request.requirements && (
                    <div className="col-span-2">
                      <h3 className="font-semibold">Requirements</h3>
                      <p>{typeof request.requirements === 'object' 
                          ? JSON.stringify(request.requirements) 
                          : request.requirements}</p>
                    </div>
                  )}
                  
                  {request.special_instructions && (
                    <div className="col-span-2">
                      <h3 className="font-semibold">Special Instructions</h3>
                      <p>{request.special_instructions}</p>
                    </div>
                  )}
                  
                  {request.meeting_link && (
                    <div className="col-span-2">
                      <h3 className="font-semibold">Meeting Link</h3>
                        <a href={request.meeting_link} target="_blank" rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline">
                            Join Meeting
                        </a>
                        </div>
                  )
                  }
                  </TabsContent>
                  </Tabs>
        </>)
        }
      </DialogContent>
    </Dialog>
  )
}
    
