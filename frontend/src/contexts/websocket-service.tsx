"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { getUserData } from '@/lib/auth'
import { Button } from '@/components/ui/button'

type WebSocketContextType = {
  notifications: any[]
  unreadCount: number
  markAsRead: (id: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const userData = getUserData()
  const userId = userData?.id

  useEffect(() => {    
    // Connect to WebSocket
    const accessToken = localStorage.getItem("accessToken")
    const ws = new WebSocket(`ws://localhost:8000/ws/notifications/${userId}/?token=${accessToken}`)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket message:', data)
      
      // Handle different message types
      switch (data.type) {
        case 'substitute_request':
          handleSubstituteRequest(data)
          break
        case 'substitute_invitation':
          handleSubstituteInvitation(data)
          break
        case 'substitute_assigned':
          handleSubstituteAssigned(data)
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
    // Handle new substitute request
    const newNotification = {
      id: Date.now().toString(),
      type: 'substitute_request',
      message: `New substitute request for ${data.subject} on ${data.date}`,
      read: false,
      data: data,
      createdAt: new Date().toISOString()
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    toast({
      title: "New Substitute Request",
      description: newNotification.message,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard-teacher/requests/${data.id}`)}
        >
          View
        </Button>
      ),
    })
  }
  
  const handleSubstituteInvitation = (data: any) => {
    // Similar to handleSubstituteRequest
  }
  
  const handleSubstituteAssigned = (data: any) => {
    // Similar to handleSubstituteRequest
  }
  
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
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
      setUnreadCount(prev => prev - 1)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  return (
    <WebSocketContext.Provider value={{ notifications, unreadCount, markAsRead }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}