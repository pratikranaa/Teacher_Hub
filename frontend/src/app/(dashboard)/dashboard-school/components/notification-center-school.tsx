import { useState } from 'react'
import { Bell, CheckCircle, Clock, Trash2, Filter } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'

export function SchoolNotificationCenter() {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useWebSocket()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  // Group notifications by type relevant to school admin/principal
  const requestNotifications = notifications.filter(n => n.type === 'substitute_request')
  const assignmentNotifications = notifications.filter(n => n.type === 'substitute_assigned')
  const availabilityNotifications = notifications.filter(n => n.type === 'teacher_availability')
  const schoolUpdateNotifications = notifications.filter(n => n.type === 'school_profile_updated')

  // Apply priority filtering if needed
  const filteredNotifications = filter === 'all' 
    ? notifications
    : filter === 'high' 
      ? notifications.filter(n => n.data.priority === 'HIGH')
      : notifications.filter(n => n.data.priority !== 'HIGH')

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Navigate based on notification type
    switch(notification.type) {
      case 'substitute_request':
        router.push(`/dashboard-school/requests/${notification.data.request_id}`)
        break
      case 'substitute_assigned':
        router.push(`/dashboard-school/requests/${notification.data.request_id}`)
        break
      case 'teacher_availability':
        router.push(`/dashboard-school/teachers/${notification.data.teacher_id}`)
        break
      case 'school_profile_updated':
        router.push('/dashboard-school/settings')
        break
      default:
        break
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
    if (diffDays < 7) return `${diffDays}d ago`
    return format(date, 'MMM dd, yyyy')
  }

  const renderNotificationList = (notificationList: any[]) => {
    if (notificationList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 p-6">
          <p className="text-muted-foreground">No notifications</p>
        </div>
      )
    }
    
    return (
      <div className="divide-y">
        {notificationList.map((notification) => (
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
                  {notification.data.priority === 'HIGH' && (
                    <Badge variant="destructive" className="text-xs">High Priority</Badge>
                  )}
                  {!notification.read && (
                    <Badge variant="outline" className="text-xs">New</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">School Notifications</h4>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('high')}>High Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('normal')}>Normal Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => notifications.forEach(n => !n.read && markAsRead(n.id))}
              >
                Mark all read
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearNotifications}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="assignments">Assigned</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="mt-0">
              {renderNotificationList(filteredNotifications)}
            </TabsContent>
            
            <TabsContent value="requests" className="mt-0">
              {renderNotificationList(requestNotifications.filter(n => 
                filter === 'all' || (filter === 'high' ? n.data.priority === 'HIGH' : n.data.priority !== 'HIGH')
              ))}
            </TabsContent>
            
            <TabsContent value="assignments" className="mt-0">
              {renderNotificationList(assignmentNotifications.filter(n => 
                filter === 'all' || (filter === 'high' ? n.data.priority === 'HIGH' : n.data.priority !== 'HIGH')
              ))}
            </TabsContent>
            
            <TabsContent value="availability" className="mt-0">
              {renderNotificationList(availabilityNotifications)}
            </TabsContent>
            
            <TabsContent value="updates" className="mt-0">
              {renderNotificationList(schoolUpdateNotifications)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}