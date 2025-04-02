import React from 'react'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatTime } from "@/lib/utils"
import { acceptSubstituteRequest, declineSubstituteRequest } from "@/lib/api"
import { toast } from "sonner"

interface RequestCardProps {
  request: {
    id: string
    subject: string
    grade: string
    section: string
    date: string
    startTime: string
    endTime: string
    mode: string
    priority: string
    status: string
    description?: string
    requirements?: string
  }
  onStatusChange?: () => void
  showActions?: boolean
}

export function RequestCard({ request, onStatusChange, showActions = true }: RequestCardProps) {
  const handleAccept = async () => {
    try {
      await acceptSubstituteRequest(request.id)
      toast.success("Request accepted! You have been assigned to this class.")
      if (onStatusChange) onStatusChange()
    } catch (error) {
      toast.error("Failed to accept request. Please try again.")
      console.error(error)
    }
  }

  const handleDecline = async () => {
    try {
      await declineSubstituteRequest(request.id)
      toast.success("Request declined.")
      if (onStatusChange) onStatusChange()
    } catch (error) {
      toast.error("Failed to decline request. Please try again.")
      console.error(error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>{request.subject} - Grade {request.grade}{request.section}</CardTitle>
          <Badge variant={
            request.status === 'pending' ? 'outline' : 
            request.status === 'confirmed' ? 'default' :
            'destructive'
          }>{request.status}</Badge>
        </div>
        <CardDescription>
          {formatDate(request.date)} | {formatTime(request.startTime)} - {formatTime(request.endTime)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{request.description}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="outline">{request.mode}</Badge>
          <Badge variant={
            request.priority === 'high' ? 'destructive' : 
            request.priority === 'medium' ? 'default' : 
            'outline'
          }>{request.priority} priority</Badge>
        </div>
      </CardContent>
      {showActions && request.status === 'pending' && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDecline}>Decline</Button>
          <Button onClick={handleAccept}>Accept</Button>
        </CardFooter>
      )}
    </Card>
  )
}