"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function RejectedRequestsTable({ data, isLoading }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium">No rejected requests</h3>
        <p className="text-muted-foreground">You haven't declined any substitute requests.</p>
      </div>
    )
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)
  
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
            <TableHead>Priority</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((request) => {
            // Find user's invitation with DECLINED status
            const userInvitation = request.invitations?.find(inv => 
              inv.teacher_id === localStorage.getItem("userId") && 
              inv.status === 'DECLINED'
            )
            
            return (
              <TableRow key={request.id}>
                <TableCell>{request.subject}</TableCell>
                <TableCell>{request.grade}</TableCell>
                <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
                <TableCell>{`${request.start_time} - ${request.end_time}`}</TableCell>
                <TableCell>{request.school.name}</TableCell>
                <TableCell>
                  <PriorityBadge priority={request.priority} />
                </TableCell>
                <TableCell>
                  {userInvitation?.response_note ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline">View Reason</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{userInvitation.response_note}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground text-sm">No reason provided</span>
                  )}
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