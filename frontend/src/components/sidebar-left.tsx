"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  AudioWaveform,
  Blocks,
  Calendar,
  Command,
  Home,
  Inbox,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Plus,
  ChevronsUpDown,
  LogOut,
  User,
  Bell,
  Clock,
  Video,
} from "lucide-react"

import { NavFavorites } from "@/components/nav-favorites"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavWorkspaces } from "@/components/nav-workspaces"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"


export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // This is sample data with dynamic isActive based on current path
  const data = {
    teams: [
      {
        name: "Teacher Hub",
        logo: Command,
        plan: "Enterprise",
      },
    ],
    navMain: [
      {
        title: "Home",
        url: "/dashboard",
        icon: Home,
        isActive: pathname === "/dashboard-teacher" || pathname === "/dashboard" || pathname === "/dashboard-school",
      },
      {
        title: "My Profile",
        url: "/account",
        icon: User,
        isActive: pathname === "/account",
      },
      {
        title: "Session History",
        url: "/history",
        icon: Clock,
        badge: "10",
        isActive: pathname === "/history",
      },
      {
        title: "External Recordings",
        url: "/external-recordings",
        icon: Video,
        isActive: pathname === "/external-recordings",
      },
    ],
    navSecondary: [
    ],
    favorites: [
    ],
    workspaces: [
    ],
  }

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavFavorites favorites={data.favorites} /> */}
        {/* <NavWorkspaces workspaces={data.workspaces} /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
