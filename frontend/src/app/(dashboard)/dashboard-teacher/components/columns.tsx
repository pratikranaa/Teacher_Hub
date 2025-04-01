"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Updated type to include more detailed request information
export type Request = {
  id: string
  status: "pending" | "confirmed" | "rejected"
  details: string
  assignedTeacher: string
  subject: string
  grade: string
  section: string
  startTime: string
  endTime: string
  priority: "low" | "medium" | "high"
  mode: "online" | "offline"
  description: string
  requirements: string
}

export const columns: ColumnDef<Request>[] = [
  {
    accessorKey: "id",
    header: "Request ID",
  },
  {
    accessorKey: "status",
    header: "Status of Request",
    cell: ({ row }) => {
      const status = row.original?.status || "unknown"
      return (
        <span
          className={
            status === "pending"
              ? "text-yellow-500"
              : status === "confirmed"
              ? "text-green-500"
              : status === "rejected"
              ? "text-red-500"
              : "text-gray-500"
          }
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    },
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const request = row.original
      return (
        <Sheet>
          <SheetTrigger className="text-blue-500 underline hover:text-blue-700">
            View Details
          </SheetTrigger>
          <SheetContent className="w-[600px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Request Details</SheetTitle>
            </SheetHeader>
            <SheetDescription className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Request ID:</p>
                  <p>{request?.id || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Status:</p>
                  <p>{request?.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Assigned Teacher:</p>
                  <p>{request?.assignedTeacher || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Subject:</p>
                  <p>{request?.subject || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Grade:</p>
                  <p>{request?.grade || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Section:</p>
                  <p>{request?.section || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Start Time:</p>
                  <p>{request?.startTime || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">End Time:</p>
                  <p>{request?.endTime || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Priority:</p>
                  <p>{request?.priority ? request.priority.charAt(0).toUpperCase() + request.priority.slice(1) : "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Mode:</p>
                  <p>{request?.mode ? request.mode.charAt(0).toUpperCase() + request.mode.slice(1) : "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold">Description:</p>
                <p>{request?.description || "N/A"}</p>
              </div>
              <div>
                <p className="font-semibold">Requirements:</p>
                <p>{request?.requirements || "N/A"}</p>
              </div>
            </SheetDescription>
          </SheetContent>
        </Sheet>
      )
    },
  },
]