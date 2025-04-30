"use client"

import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useState, useEffect } from "react"
import { BASE_API_URL } from "@/lib/config"
import { ExternalLink, Loader2 } from "lucide-react" 

export function RequestHistoryTable({ data, isLoading }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const itemsPerPage = 5
  
  // Calculate pagination
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
  
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium">No request history</h3>
        <p className="text-muted-foreground">You don't have any past substitute requests.</p>
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
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((request) => {
            // Find user's invitation
            const userInvitation = request.invitations?.find(inv => 
              inv.teacher_id === localStorage.getItem("userId")
            )
            
            const status = userInvitation?.status || request.status
            
            return (
              <TableRow key={request.id}>
                <TableCell>{request.subject}</TableCell>
                <TableCell>{request.grade}</TableCell>
                <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
                <TableCell>{`${request.start_time} - ${request.end_time}`}</TableCell>
                <TableCell>{request.school?.name}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell>
                  <Badge variant={request.mode === 'ONLINE' ? 'outline' : 'secondary'}>
                    {request.mode}
                  </Badge>
                </TableCell>
                <TableCell>
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
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Request ID</p>
                                <p>{selectedRequest.id}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <StatusBadge status={selectedRequest.status} />
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
                          </div>
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </TableCell>
              </TableRow>
            )
          })}
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

function StatusBadge({ status }) {
  const variants = {
    'ACCEPTED': { variant: 'default', class: 'bg-green-500' },
    'ASSIGNED': { variant: 'default', class: 'bg-green-500' },
    'WITHDRAWN': { variant: 'outline', class: 'bg-gray-100 text-gray-800' },
    'EXPIRED': { variant: 'outline', class: 'bg-gray-100 text-gray-800' },
    'COMPLETED': { variant: 'default', class: 'bg-blue-500' },
  }
  
  const { variant, class: className } = variants[status] || { variant: 'outline', class: '' }
  
  return <Badge variant={variant} className={className}>{status}</Badge>
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