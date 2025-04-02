"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function PendingRequestsTable({ data, isLoading, onAccept, onDecline }) {
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [rejectionNote, setRejectionNote] = useState('')

  const handleAccept = (requestId) => {
    onAccept(requestId)
  }

  const openDeclineDialog = (requestId) => {
    setSelectedRequestId(requestId)
    setRejectionNote('')
    setDeclineDialogOpen(true)
  }

  const handleDeclineSubmit = () => {
    onDecline(selectedRequestId, rejectionNote)
    setDeclineDialogOpen(false)
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium">No pending requests</h3>
        <p className="text-muted-foreground">You don't have any pending substitute requests.</p>
      </div>
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.subject}</TableCell>
              <TableCell>{request.grade}</TableCell>
              <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
              <TableCell>{`${request.start_time} - ${request.end_time}`}</TableCell>
              <TableCell>{request.school.name}</TableCell>
              <TableCell>
                <Badge variant={request.mode === 'ONLINE' ? 'outline' : 'secondary'}>
                  {request.mode}
                </Badge>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={request.priority} />
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleAccept(request.id)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => openDeclineDialog(request.id)}
                    className="border-red-500 text-red-500 hover:bg-red-50"
                  >
                    Decline
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this substitute request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-note">Reason</Label>
              <Textarea
                id="rejection-note"
                placeholder="Enter reason for declining..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeclineSubmit}
              className="bg-red-500 hover:bg-red-600"
              disabled={!rejectionNote.trim()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PriorityBadge({ priority }) {
  const variants = {
    'LOW': { variant: 'outline', class: 'bg-blue-50 text-blue-800 border-blue-200' },
    'MEDIUM': { variant: 'outline', class: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    'HIGH': { variant: 'default', class: 'bg-orange-500' },
    'URGENT': { variant: 'destructive', class: '' },
  }
  
  const { variant, class: className } = variants[priority] || variants['MEDIUM']
  
  return <Badge variant={variant} className={className}>{priority}</Badge>
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}