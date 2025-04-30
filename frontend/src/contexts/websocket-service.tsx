"use client"

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { getUserData } from '@/lib/auth'
import { BASE_API_URL } from '@/lib/config'
import { Button } from "@/components/ui/button"

interface WebSocketContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  clearNotifications: () => Promise<void>
}

interface Notification {
  id: string
  type: 'substitute.request' | 'substitute.invitation' | 'substitute.assigned' | 'request.status_change' | 'teacher.availability' | 'school.profile.updated'
  message: string
  read: boolean
  data: any
  createdAt: string
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const userData = getUserData()
  const userId = userData?.id
  const userType = userData?.user_type

  useEffect(() => {    
    // Connect to WebSocket
    const accessToken = localStorage.getItem("accessToken")
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${BASE_API_URL.replace(/^https?:\/\//, '')}/ws/notifications/?token=${accessToken}`);
       
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
        ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket message:', data)
      
      // Handle different message types
      switch (data.type) {
        case 'substitute.request':          // Changed from substitute_request
          handleSubstituteRequest(data)
          break
        case 'substitute.invitation':       // Changed from substitute_invitation
          handleSubstituteInvitation(data)
          break
        case 'substitute.assigned':         // Changed from substitute_assigned
          handleSubstituteAssigned(data)
          break
        case 'request.status_change':       // Changed from request_status_change
          handleRequestStatusChange(data)
          break
        case 'teacher.availability':        // Changed from teacher_availability
          handleTeacherAvailability(data) 
          break
        case 'school.profile.updated':      // Changed from school_profile_updated
          handleSchoolProfileUpdated(data)
          break
        default:
          console.log('Unknown message type:', data.type)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event)
    }
    
    setSocket(ws)
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [toast, router])
  
  const handleSubstituteRequest = (data: any) => {
    // Handle new substitute request (for school admin/principal)
    const newNotification = {
      id: Date.now().toString(),
      type: 'substitute_request',
      message: `New substitute request for ${data.content.subject} on ${data.content.date}`,
      read: false,
      data: data.content,
      createdAt: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    if (userType === 'SCHOOL_ADMIN' || userType === 'PRINCIPAL') {
      toast({
        title: "New Substitute Request",
        description: newNotification.message,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard-school/requests/${data.content.request_id}`)}
          >
            View
          </Button>
        ),
      })
    }
  }
  
  const handleSubstituteInvitation = (data: any) => {
    // Handle substitute invitation (for teachers)
    const newNotification = {
      id: Date.now().toString(),
      type: 'substitute_invitation',
      message: `You've been invited to teach ${data.content.subject} on ${data.content.date}`,
      read: false,
      data: data.content,
      createdAt: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    if (userType === 'INTERNAL_TEACHER' || userType === 'EXTERNAL_TEACHER') {
      toast({
        title: "New Teaching Invitation",
        description: newNotification.message,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard-teacher/invitations/${data.content.request_id}`)}
          >
            View
          </Button>
        ),
      })
    }
  }
  
  const handleSubstituteAssigned = (data: any) => {
    // For both teacher and school admin/principal
    const message = userType === 'SCHOOL_ADMIN' || userType === 'PRINCIPAL'
      ? `${data.content.teacher} has been assigned to teach ${data.content.subject} on ${data.content.date}`
      : `You've been assigned to teach ${data.content.subject} on ${data.content.date}`;
    
    const newNotification = {
      id: Date.now().toString(),
      type: 'substitute_assigned',
      message: message,
      read: false,
      data: data.content,
      createdAt: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    toast({
      title: "Substitute Assigned",
      description: message,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(userType === 'SCHOOL_ADMIN' || userType === 'PRINCIPAL' 
            ? `/dashboard-school/requests/${data.content.request_id}` 
            : `/dashboard-teacher/assignments/${data.content.request_id}`)}
        >
          View
        </Button>
      ),
    })
  }
  
  const handleRequestStatusChange = (data: any) => {
    // For teachers who created requests
    const newNotification = {
      id: Date.now().toString(),
      type: 'request_status_change',
      message: `Request status changed to ${data.content.status}: ${data.content.subject} on ${data.content.date}`,
      read: false,
      data: data.content,
      createdAt: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    if (userType === 'INTERNAL_TEACHER') {
      toast({
        title: "Request Status Updated",
        description: newNotification.message,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard-teacher/my-requests/${data.content.request_id}`)}
          >
            View
          </Button>
        ),
      })
    }
  }
  
  const handleTeacherAvailability = (data: any) => {
    // For school admin/principal
    if (userType === 'SCHOOL_ADMIN' || userType === 'PRINCIPAL') {
      const newNotification = {
        id: Date.now().toString(),
        type: 'teacher_availability',
        message: `${data.content.teacher_name} updated their availability for ${data.content.date}`,
        read: false,
        data: data.content,
        createdAt: new Date().toISOString()
      }
      
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      toast({
        title: "Teacher Availability Updated",
        description: newNotification.message,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard-school/teachers/${data.content.teacher_id}`)}
          >
            View Profile
          </Button>
        ),
      })
    }
  }
  
  const handleSchoolProfileUpdated = (data: any) => {
    // For school staff only
    if (userType === 'SCHOOL_ADMIN' || userType === 'PRINCIPAL') {
      const newNotification = {
        id: Date.now().toString(),
        type: 'school_profile_updated',
        message: `School profile has been updated: ${data.content.message}`,
        read: false,
        data: data.content,
        createdAt: new Date().toISOString()
      }
      
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      toast({
        title: "School Profile Updated",
        description: newNotification.message,
      })
    }
  }
  
  const markAsRead = async (id: string) => {
    try {
      await fetch(`${BASE_API_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      })
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  const clearNotifications = async () => {
    try {
      await fetch(`${BASE_API_URL}/api/notifications/clear`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      })
      
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }
  
  return (
    <WebSocketContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead,
      clearNotifications
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}