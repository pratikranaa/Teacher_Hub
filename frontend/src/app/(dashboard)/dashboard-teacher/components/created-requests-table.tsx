"use client"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"
import { request } from "http"
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useState } from "react"


export function CreatedRequestsTable({ data, isLoading, onRefresh }) {

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)




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
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Subject/Class</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Responses</TableHead>
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
            <TableCell>
              {request.assigned_teacher ? 
                `${request.assigned_teacher.first_name} ${request.assigned_teacher.last_name}` : 
                'Not assigned'}
            </TableCell>
            <TableCell>
              {request.invitations ? (
                <span>
                  {request.invitations.filter(inv => inv.status === 'ACCEPTED').length} accepted / 
                  {request.invitations.filter(inv => inv.status === 'DECLINED').length} declined /
                  {request.invitations.filter(inv => inv.status === 'PENDING').length} pending
                </span>
              ) : 'No invitations'}
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