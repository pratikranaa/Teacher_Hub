"use client"

import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DataTable } from "./data-table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { columns, Request } from "./columns"
import { AvailabilityForm } from "@/components/dashboard/AvailabilityForm"
import { CreateRequestForm } from "@/components/dashboard/CreateRequestForm"

const sampleData: Request[] = [
  {
    id: "REQ001",
    status: "pending",
    details: "This is a pending request for class scheduling.",
  },
  {
    id: "REQ002",
    status: "confirmed",
    details: "This request has been confirmed for the upcoming session.",
  },
  {
    id: "REQ003",
    status: "rejected",
    details: "This request was rejected due to scheduling conflicts.",
  },
  {
    id: "REQ004",
    status: "pending",
    details: "This is another pending request for a new class.",
  },
]

export default function Page() {
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    Teacher Requests Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-xl bg-muted/5 p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Teacher Requests</h1>
              {/* Create Request Button */}
              <Sheet>
                <SheetTrigger>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Create Request
                  </button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Create a New Request</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <CreateRequestForm />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <DataTable columns={columns} data={sampleData} />
            <div className="mt-6">
              <AvailabilityForm />
            </div>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  )
}