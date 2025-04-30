import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut, Plus } from "lucide-react"

import { DatePicker } from "@/components/date-picker"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { clearAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"



// This is sample data.
const defaultData = {
  user: {
    name: "Please Login",
    email: "Login Please",
    avatar: "/avatars/shadcn.jpg",
  },
}



export function SidebarRight({
  userData,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userData?: typeof defaultData.user
}) {
  // Use provided userData or fall back to default
  const user = userData || defaultData.user;
  const router = useRouter()

  const { toast } = useToast()

  const handleLogout = () => {
    // Clear authentication data directly from the auth util
    clearAuth()
    
    // Display logout success notification
    toast({
      variant: "destructive",
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    })
    
    // Redirect to login page
    router.push("/login")
  }

  
  return (
    <Sidebar
      collapsible="none"
      className="sticky hidden lg:flex top-0 h-svh border-l"
      {...props}
    >
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarContent>
        <DatePicker />
        <SidebarSeparator className="mx-0" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} >
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
