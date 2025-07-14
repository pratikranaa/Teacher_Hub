"use client"

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Clock, Plus, Edit, Trash2, CheckCircle, AlertCircle, 
  Calendar as CalendarIcon, Users, BookOpen 
} from 'lucide-react'
import { format, isSameDay, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface AvailabilitySlot {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: 'AVAILABLE' | 'BUSY' | 'TENTATIVE'
  subjects?: string[]
  notes?: string
  isRecurring?: boolean
  recurrencePattern?: 'WEEKLY' | 'DAILY' | 'MONTHLY'
}

interface SubstituteRequest {
  id: string
  date: Date
  startTime: string
  endTime: string
  subject: string
  grade: string
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

interface EnhancedCalendarProps {
  userType: 'TEACHER' | 'SCHOOL_ADMIN'
  availabilitySlots?: AvailabilitySlot[]
  substituteRequests?: SubstituteRequest[]
  onAvailabilityChange?: (slots: AvailabilitySlot[]) => void
  onRequestClick?: (request: SubstituteRequest) => void
}

export function EnhancedCalendar({
  userType,
  availabilitySlots = [],
  substituteRequests = [],
  onAvailabilityChange,
  onRequestClick
}: EnhancedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null)
  const [newSlot, setNewSlot] = useState({
    startTime: '09:00',
    endTime: '17:00',
    status: 'AVAILABLE' as const,
    subjects: [] as string[],
    notes: '',
    isRecurring: false,
    recurrencePattern: 'WEEKLY' as const
  })

  const getDateEvents = (date: Date) => {
    const dayStart = startOfDay(date)
    
    const dayAvailability = availabilitySlots.filter(slot => 
      isSameDay(slot.date, dayStart)
    )
    
    const dayRequests = substituteRequests.filter(request => 
      isSameDay(request.date, dayStart)
    )
    
    return { availability: dayAvailability, requests: dayRequests }
  }

  const getDateIndicator = (date: Date) => {
    const { availability, requests } = getDateEvents(date)
    
    if (requests.length > 0) {
      const hasUrgent = requests.some(r => r.priority === 'URGENT')
      const hasHigh = requests.some(r => r.priority === 'HIGH')
      
      if (hasUrgent) return 'urgent'
      if (hasHigh) return 'high'
      return 'normal'
    }
    
    if (availability.length > 0) {
      const hasAvailable = availability.some(a => a.status === 'AVAILABLE')
      const hasBusy = availability.some(a => a.status === 'BUSY')
      
      if (hasAvailable && hasBusy) return 'mixed'
      if (hasAvailable) return 'available'
      if (hasBusy) return 'busy'
    }
    
    return null
  }

  const handleAddSlot = () => {
    if (!selectedDate) return
    
    const slot: AvailabilitySlot = {
      id: Date.now().toString(),
      date: selectedDate,
      ...newSlot
    }
    
    const updatedSlots = [...availabilitySlots, slot]
    onAvailabilityChange?.(updatedSlots)
    
    setShowAddSlot(false)
    setNewSlot({
      startTime: '09:00',
      endTime: '17:00',
      status: 'AVAILABLE',
      subjects: [],
      notes: '',
      isRecurring: false,
      recurrencePattern: 'WEEKLY'
    })
  }

  const handleDeleteSlot = (slotId: string) => {
    const updatedSlots = availabilitySlots.filter(slot => slot.id !== slotId)
    onAvailabilityChange?.(updatedSlots)
  }

  const selectedDateEvents = selectedDate ? getDateEvents(selectedDate) : { availability: [], requests: [] }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {userType === 'TEACHER' ? 'Availability Calendar' : 'Request Calendar'}
          </CardTitle>
          <CardDescription>
            {userType === 'TEACHER' 
              ? 'Manage your teaching availability'
              : 'View substitute requests and teacher availability'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              urgent: (date) => getDateIndicator(date) === 'urgent',
              high: (date) => getDateIndicator(date) === 'high',
              normal: (date) => getDateIndicator(date) === 'normal',
              available: (date) => getDateIndicator(date) === 'available',
              busy: (date) => getDateIndicator(date) === 'busy',
              mixed: (date) => getDateIndicator(date) === 'mixed',
            }}
            modifiersStyles={{
              urgent: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' },
              high: { backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 'bold' },
              normal: { backgroundColor: '#dbeafe', color: '#2563eb' },
              available: { backgroundColor: '#dcfce7', color: '#16a34a' },
              busy: { backgroundColor: '#fecaca', color: '#dc2626' },
              mixed: { backgroundColor: '#e0e7ff', color: '#6366f1' },
            }}
          />
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {userType === 'TEACHER' ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-200" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-200" />
                    <span>Busy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-200" />
                    <span>Mixed</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-200" />
                    <span>Urgent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-200" />
                    <span>High Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-200" />
                    <span>Normal</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
            </span>
            {userType === 'TEACHER' && selectedDate && (
              <Button
                size="sm"
                onClick={() => setShowAddSlot(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Slot
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedDate ? (
            <p className="text-muted-foreground text-center py-8">
              Select a date to view details
            </p>
          ) : (
            <>
              {/* Availability Slots (for teachers) */}
              {userType === 'TEACHER' && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Availability Slots
                  </h4>
                  {selectedDateEvents.availability.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No availability set for this date
                    </p>
                  ) : (
                    selectedDateEvents.availability.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Badge
                              variant={
                                slot.status === 'AVAILABLE' ? 'default' :
                                slot.status === 'BUSY' ? 'destructive' : 'secondary'
                              }
                            >
                              {slot.status}
                            </Badge>
                          </div>
                          {slot.subjects && slot.subjects.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Subjects: {slot.subjects.join(', ')}
                            </p>
                          )}
                          {slot.notes && (
                            <p className="text-sm text-muted-foreground">
                              {slot.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSlot(slot)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Substitute Requests */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Substitute Requests
                </h4>
                {selectedDateEvents.requests.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No requests for this date
                  </p>
                ) : (
                  selectedDateEvents.requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => onRequestClick?.(request)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {request.startTime} - {request.endTime}
                          </span>
                          <Badge
                            variant={
                              request.priority === 'URGENT' ? 'destructive' :
                              request.priority === 'HIGH' ? 'default' : 'secondary'
                            }
                          >
                            {request.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.subject} - Grade {request.grade}
                        </p>
                        <div className="flex items-center gap-2">
                          {request.status === 'COMPLETED' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : request.status === 'ASSIGNED' ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {request.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Slot Modal */}
      {(showAddSlot || editingSlot) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {editingSlot ? 'Edit Availability' : 'Add Availability Slot'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={editingSlot?.startTime || newSlot.startTime}
                    onChange={(e) => {
                      if (editingSlot) {
                        setEditingSlot({ ...editingSlot, startTime: e.target.value })
                      } else {
                        setNewSlot({ ...newSlot, startTime: e.target.value })
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={editingSlot?.endTime || newSlot.endTime}
                    onChange={(e) => {
                      if (editingSlot) {
                        setEditingSlot({ ...editingSlot, endTime: e.target.value })
                      } else {
                        setNewSlot({ ...newSlot, endTime: e.target.value })
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingSlot?.status || newSlot.status}
                  onValueChange={(value: 'AVAILABLE' | 'BUSY' | 'TENTATIVE') => {
                    if (editingSlot) {
                      setEditingSlot({ ...editingSlot, status: value })
                    } else {
                      setNewSlot({ ...newSlot, status: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="TENTATIVE">Tentative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={editingSlot?.notes || newSlot.notes}
                  onChange={(e) => {
                    if (editingSlot) {
                      setEditingSlot({ ...editingSlot, notes: e.target.value })
                    } else {
                      setNewSlot({ ...newSlot, notes: e.target.value })
                    }
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={editingSlot?.isRecurring || newSlot.isRecurring}
                  onCheckedChange={(checked) => {
                    if (editingSlot) {
                      setEditingSlot({ ...editingSlot, isRecurring: checked })
                    } else {
                      setNewSlot({ ...newSlot, isRecurring: checked })
                    }
                  }}
                />
                <Label htmlFor="recurring">Recurring</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddSlot(false)
                    setEditingSlot(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddSlot}>
                  {editingSlot ? 'Update' : 'Add'} Slot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 