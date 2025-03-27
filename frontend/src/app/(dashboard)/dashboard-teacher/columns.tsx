"use client"

import { ColumnDef } from "@tanstack/react-table"

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
      const status = row.original.status
      return (
        <span
          className={
            status === "pending"
              ? "text-yellow-500"
              : status === "confirmed"
              ? "text-green-500"
              : "text-red-500"
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
      <button
        className="text-blue-500 underline hover:text-blue-700"
        onClick={() => alert(`Details for Request ID: ${row.original.id}`)}
      >
        View Details
      </button>
    ),
  },
]