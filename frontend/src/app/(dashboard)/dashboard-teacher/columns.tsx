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

// This type is used to define the shape of our data.
export type Request = {
  id: string
  status: "pending" | "confirmed" | "rejected"
  details: string
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
      const status = row.original?.status || "unknown" // Safely access status
      return (
        <span
          className={
            status === "pending"
              ? "text-yellow-500"
              : status === "confirmed"
              ? "text-green-500"
              : status === "rejected"
              ? "text-red-500"
              : "text-gray-500" // Default color for unknown status
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
    cell: ({ row }) => (
      <Sheet>
        <SheetTrigger className="text-blue-500 underline hover:text-blue-700">
          View Details
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Request Details</SheetTitle>
            <SheetDescription>
              <p><strong>Request ID:</strong> {row.original?.id || "N/A"}</p>
              <p><strong>Status:</strong> {row.original?.status || "N/A"}</p>
              <p><strong>Details:</strong> {row.original?.details || "N/A"}</p>
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    ),
  },
]