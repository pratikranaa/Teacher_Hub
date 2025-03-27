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
import { Calendars } from "@/components/calendars"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Payment, columns } from "./columns"
import { DataTable } from "./data-table"
import { AvailabilityForm } from "@/components/auth/LoginForm"

async function getData(): Promise<Payment[]> {
  // Fetch data from your API here.
  return [
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
    },
    // ...
  ]
}

const data = await getData()

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
                    Welcome to Your Dashboard!
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/5 p-4">
            <DataTable columns={columns} data={data} />
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
              {/* Increased the form size */}
              <div className="w-full max-w-2xl">
                <AvailabilityForm />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  )
}