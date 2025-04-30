"use client"

import { useState, useEffect } from "react"
import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/hooks/use-userdata"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function ExternalRecordingsPage() {
  const { userData, isLoading: userLoading } = useUserData()
  const { toast } = useToast()
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  
  // Function to handle iframe load events
  const handleIframeLoad = () => {
    setIsIframeLoaded(true)
  }

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
                    {userLoading ? "External Recordings" : `External Recordings - ${userData?.first_name || userData?.username}`}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex h-full flex-1 flex-col space-y-8 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">JioMeet External Recordings</h2>
              <p className="text-muted-foreground">
                Access your JioMeet recordings directly from their platform dashboard.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" asChild>
                <Link href="/history">
                  View Internal Recordings
                </Link>
              </Button>
              <Button asChild>
                <a 
                  href="https://platform.jiomeet.com/dashboard/recordings" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open in New Window
                </a>
              </Button>
            </div>
          </div>

          {/* JioMeet iframe container */}
          <div className="flex-1 relative border rounded-lg shadow-sm overflow-hidden" style={{ minHeight: "70vh" }}>
            {/* Loading overlay */}
            {!isIframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-70 z-10">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p className="text-lg font-medium">Loading JioMeet Dashboard...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You may need to log in to your JioMeet account
                </p>
              </div>
            )}
            
            {/* JioMeet dashboard iframe */}
            <iframe 
              src="https://platform.jiomeet.com/dashboard/recordings"
              className="w-full h-full"
              style={{ minHeight: "70vh", border: "none" }}
              onLoad={handleIframeLoad}
              allow="fullscreen"
              title="JioMeet Recordings Dashboard"
            />
          </div>
          
          <div className="bg-slate-100 dark:bg-slate-800 border rounded-lg p-4 text-sm text-slate-800 dark:text-slate-200">
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Instructions:</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>You may need to sign in to your JioMeet account if prompted.</li>
              <li>All recordings created from Teacher Hub will appear in this dashboard.</li>
              <li>Use the search and filter options in the JioMeet interface to find specific recordings.</li>
              <li>You can download or share recordings directly from the JioMeet dashboard.</li>
            </ol>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight userData={userData ? {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        avatar: userData.profile_image || "/avatars/shadcn.jpg"
      } : undefined} />
    </SidebarProvider>
  )
}