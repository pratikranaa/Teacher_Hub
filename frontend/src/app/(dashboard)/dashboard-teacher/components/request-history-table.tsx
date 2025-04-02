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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export function RequestHistoryTable({ data, isLoading }) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
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
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
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
                <TableCell>{request.school.name}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell>
                  <Badge variant={request.mode === 'ONLINE' ? 'outline' : 'secondary'}>
                    {request.mode}
                  </Badge>
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