"use client"

import * as React from "react"
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

// This is sample data.
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
      isActive: (window.location.pathname === "/dashboard-teacher" || window.location.pathname === "/dashboard" || window.location.pathname === "/dashboard-school" ) ? true : false,
    },
    {
      title: "My Profile",
      url: "/account",
      icon: User,
      isActive: (window.location.pathname === "/account") ? true : false,
    },
    // {
    //   title: "Request Substitute",
    //   url: "#",
    //   icon: Plus,
    // },
    {
      title: "Session History",
      url: "/history",
      icon: Clock,
      badge: "10",
      isActive: (window.location.pathname === "/history") ? true : false,
    },
  ],
  navSecondary: [
  ],
  favorites: [
  ],
  workspaces: [
  ],
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
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
