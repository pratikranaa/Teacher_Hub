"use client"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, Clock, XCircle, Loader2, ExternalLink } from "lucide-react"
import { request } from "http"
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Trash } from "lucide-react"
import { BASE_API_URL } from "@/lib/config"

export function CreatedRequestsTable({ data, isLoading, onRefresh }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const itemsPerPage = 5
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)

  // Fetch request details when a request is selected
  const fetchRequestDetails = async (requestId) => {
    setDetailLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${BASE_API_URL}/api/substitute-requests/${requestId}/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch request details")
      }
      
      const detailData = await response.json()
      console.log("Request details fetched successfully:", detailData)
      setSelectedRequest(detailData)
    } catch (error) {
      console.error("Error fetching request details:", error)
    } finally {
      setDetailLoading(false)
    }
  }

  // Clear selected request when sheet closes
  useEffect(() => {
    if (!sheetOpen) {
      setSelectedRequest(null)
    }
  }, [sheetOpen])

  const getBadgeVariant = (status) => {
    switch (status) {
      case "PENDING":
        return "outline"
      case "ASSIGNED":
        return "success"
      case "COMPLETED":
        return "default"
      case "CANCELLED":
        return "destructive"
      default:
        return "secondary"
    }
  }
  
  // Function to get icon based on request status
  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 mr-1" />
      case "ASSIGNED":
        return <CheckCircle className="h-4 w-4 mr-1" />
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 mr-1" />
      case "CANCELLED":
        return <XCircle className="h-4 w-4 mr-1" />
      default:
        return <AlertCircle className="h-4 w-4 mr-1" />
    }
  }

  // Function to format teacher name
  const getTeacherName = (teacherInfo) => {
    if (!teacherInfo) return "Not assigned";
    
    // Use existing name if available
    if (teacherInfo.name && teacherInfo.name.trim() !== "") {
      return teacherInfo.name;
    }
    
    // If name is empty but email exists
    if (teacherInfo.email) {
      // Extract username from email (before the @ symbol)
      const username = teacherInfo.email.split('@')[0];
      return `${username} (${teacherInfo.email})`;
    }
    
    // Fallback to ID
    return `Teacher ID: ${teacherInfo.id}`;
  }

  // Function to get invitation counts
  const getInvitationCounts = (request) => {
    if (request?.current_status) {
      return {
        accepted: request.current_status.accepted,
        declined: request.current_status.declined,
        pending: request.current_status.pending
      };
    }
    
    if (Array.isArray(request?.invitations)) {
      return {
        accepted: request.invitations.filter(inv => inv.status === 'ACCEPTED').length,
        declined: request.invitations.filter(inv => inv.status === 'DECLINED').length,
        pending: request.invitations.filter(inv => inv.status === 'PENDING').length,
        withdrawn: request.invitations.filter(inv => inv.status === 'WITHDRAWN').length
      };
    }
    
    return { accepted: 0, declined: 0, pending: 0, withdrawn: 0 };
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-muted-foreground mb-4">You haven't created any substitute requests yet.</p>
        <Button variant="outline" onClick={onRefresh}>Refresh</Button>
      </div>
    )
  }

  return (
    <div>
    <Table>
      <TableCaption>A list of Substitue requests created by you</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Subject/Class</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map((request) => (
          <TableRow key={request.id}>
            <TableCell>{(request.date)}</TableCell>
            <TableCell>{request.subject}</TableCell>
            <TableCell>{request.start_time} - {request.end_time}</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(request.status)} className="flex items-center w-fit">
                {getStatusIcon(request.status)}
                {request.status}
              </Badge>
            </TableCell>
            <TableCell className="flex gap-2">
              {/* View Details Button - Opens Sheet */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRequestDetails(request.id)}
                  >
                    View Details
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md overflow-hidden flex flex-col">
                <SheetHeader>
                    <SheetTitle>Request Details</SheetTitle>
                    <SheetDescription>
                      View comprehensive information about this substitute request
                    </SheetDescription>
                  </SheetHeader>
                  
                  {detailLoading && (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  
                  {!detailLoading && selectedRequest && (
                      <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                        <div className="py-6 space-y-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Request ID</p>
                          <p>{selectedRequest.id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <Badge variant={getBadgeVariant(selectedRequest.status)} className="flex items-center w-fit mt-1">
                            {getStatusIcon(selectedRequest.status)}
                            {selectedRequest.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p>{selectedRequest.date}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Time</p>
                          <p>{selectedRequest.start_time} - {selectedRequest.end_time}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Subject</p>
                          <p>{selectedRequest.subject}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Grade & Section</p>
                          <p>{selectedRequest.grade} {selectedRequest.section}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Mode</p>
                          <p>{selectedRequest.mode}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Priority</p>
                          <p>{selectedRequest.priority}</p>
                        </div>
                      </div>
                      
                      {selectedRequest.status === "ASSIGNED" && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-500">Assigned Teacher</p>
                          <p className="mt-1">
                            {getTeacherName(selectedRequest.assigned_teacher_details)}
                          </p>
                          <p className="text-xs text-blue-600">
                            @{selectedRequest.assigned_teacher_details?.email?.split('@')[0]}
                          </p>
                        </div>
                      )}
                      
                      {/* Meeting Link & Host Link Section */}
                      {selectedRequest.status === "ASSIGNED" && (
                        <div className="pt-2 border-t">
                          {selectedRequest.meeting_link && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">Meeting Link (For Students/Guests)</p>
                              <div className="mt-1 flex items-center">
                                <a 
                                  href={selectedRequest.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center"
                                >
                                  {selectedRequest.meeting_link}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {selectedRequest.host_link && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">Host Link (For Teacher)</p>
                              <div className="mt-1 flex items-center">
                                <a 
                                  href={selectedRequest.host_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:underline flex items-center font-medium"
                                >
                                  Join as Host
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedRequest.host_link);
                                    // You may want to add a toast notification here
                                  }}
                                >
                                  Copy
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Keep the existing meeting_link section for non-assigned statuses */}
                      {selectedRequest.status !== "ASSIGNED" && selectedRequest.meeting_link && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-500">Meeting Link</p>
                          <div className="mt-1 flex items-center">
                            <a 
                              href={selectedRequest.meeting_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              {selectedRequest.meeting_link}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {selectedRequest.description && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="mt-1">{selectedRequest.description}</p>
                        </div>
                      )}
                      
                      {selectedRequest.requirements && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-500">Requirements</p>
                          <p className="mt-1">{selectedRequest.requirements}</p>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-gray-500">Invitations</p>
                        {(() => {
                          const counts = getInvitationCounts(selectedRequest);
                          if (counts.accepted > 0 || counts.declined > 0 || counts.pending > 0 || counts.withdrawn > 0) {
                            return (
                              <p className="mt-1">
                                {counts.accepted} accepted / {counts.declined} declined / {counts.pending} pending 
                              </p>
                            );
                          }
                          return <p className="mt-1 text-gray-400">No invitations</p>;
                        })()}
                      </div>
                      
                      {Array.isArray(selectedRequest.invitations) && selectedRequest.invitations.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium text-gray-500 mb-2">Invitation Details</p>
                              <div className="space-y-3">
                                {selectedRequest.invitations.map(invitation => (
                                  <div key={invitation.id} className="p-3 border rounded-md">
                                <div className="flex justify-between">
                                  <p className="font-medium">
                                    {invitation.teacher_details?.name 
                                      ? invitation.teacher_details.name 
                                      : invitation.teacher_details?.email?.split('@')[0] || "Teacher"}
                                  </p>
                                  <Badge variant={
                                    invitation.status === 'ACCEPTED' ? 'success' : 
                                    invitation.status === 'DECLINED' ? 'destructive' : 
                                    'outline'
                                  }>
                                    {invitation.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-blue-600">
                                  @{invitation.teacher_details?.email?.split('@')[0]}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Invited: {new Date(invitation.invited_at).toLocaleString()}
                                </p>
                                {invitation.response_note && (
                                  <div className="mt-2 text-sm">
                                    <p className="font-medium">Response:</p>
                                    <p>{invitation.response_note}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {totalPages > 1 && (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1} 
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                isActive={currentPage === i + 1}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages} 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )}
    </div>
  )
}