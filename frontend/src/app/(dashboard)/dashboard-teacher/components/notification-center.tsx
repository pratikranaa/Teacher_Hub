import { useState } from 'react'
import { Bell, CheckCircle, Clock } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useWebSocket } from '@/contexts/websocket-service'
import { useRouter } from 'next/navigation'

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead } = useWebSocket()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Navigate based on notification type
    if (notification.type === 'substitute_request') {
      router.push(`/dashboard-teacher/requests/${notification.data.id}`)
    } else if (notification.type === 'substitute_invitation') {
      router.push(`/dashboard-teacher/invitations/${notification.data.id}`)
    } else if (notification.type === 'substitute_assigned') {
      router.push(`/dashboard-teacher/assignments/${notification.data.id}`)
    }
    
    setOpen(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => notifications.forEach(n => !n.read && markAsRead(n.id))}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/20' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {notification.read ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </p>
                        {!notification.read && (
                          <Badge variant="outline" className="text-xs">New</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <p className="text-muted-foreground">No notifications</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}