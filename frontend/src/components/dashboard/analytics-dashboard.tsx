"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, Clock, CheckCircle, 
  AlertCircle, Calendar, BookOpen, Star, Target 
} from 'lucide-react'

interface AnalyticsData {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  averageResponseTime: number
  teacherSatisfactionRate: number
  monthlyTrends: Array<{
    month: string
    requests: number
    completed: number
    satisfaction: number
  }>
  subjectDistribution: Array<{
    subject: string
    count: number
    color: string
  }>
  timeSlotAnalysis: Array<{
    timeSlot: string
    demand: number
    availability: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30d')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch analytics data
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        // Replace with actual API call
        const mockData: AnalyticsData = {
          totalRequests: 156,
          completedRequests: 142,
          pendingRequests: 14,
          averageResponseTime: 12.5,
          teacherSatisfactionRate: 4.6,
          monthlyTrends: [
            { month: 'Jan', requests: 45, completed: 42, satisfaction: 4.5 },
            { month: 'Feb', requests: 52, completed: 48, satisfaction: 4.3 },
            { month: 'Mar', requests: 38, completed: 36, satisfaction: 4.7 },
            { month: 'Apr', requests: 61, completed: 58, satisfaction: 4.6 },
            { month: 'May', requests: 49, completed: 46, satisfaction: 4.8 },
            { month: 'Jun', requests: 56, completed: 52, satisfaction: 4.6 },
          ],
          subjectDistribution: [
            { subject: 'Mathematics', count: 45, color: '#0088FE' },
            { subject: 'Science', count: 32, color: '#00C49F' },
            { subject: 'English', count: 28, color: '#FFBB28' },
            { subject: 'Social Studies', count: 22, color: '#FF8042' },
            { subject: 'Computer Science', count: 18, color: '#8884D8' },
          ],
          timeSlotAnalysis: [
            { timeSlot: '8:00-9:00', demand: 85, availability: 60 },
            { timeSlot: '9:00-10:00', demand: 92, availability: 75 },
            { timeSlot: '10:00-11:00', demand: 78, availability: 80 },
            { timeSlot: '11:00-12:00', demand: 65, availability: 85 },
            { timeSlot: '12:00-13:00', demand: 45, availability: 90 },
            { timeSlot: '13:00-14:00', demand: 70, availability: 70 },
            { timeSlot: '14:00-15:00', demand: 88, availability: 65 },
            { timeSlot: '15:00-16:00', demand: 95, availability: 55 },
          ]
        }
        setAnalyticsData(mockData)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeRange])

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading analytics...</div>
  }

  if (!analyticsData) {
    return <div className="flex justify-center p-8">No data available</div>
  }

  const completionRate = (analyticsData.completedRequests / analyticsData.totalRequests) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Insights into substitute teacher requests and performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageResponseTime}m</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2m from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.teacherSatisfactionRate}/5</div>
            <div className="flex items-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= analyticsData.teacherSatisfactionRate
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="subjects">Subject Distribution</TabsTrigger>
          <TabsTrigger value="timeslots">Time Slot Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Trends</CardTitle>
              <CardDescription>
                Monthly request volume and completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subject Distribution</CardTitle>
                <CardDescription>
                  Most requested subjects for substitute teaching
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.subjectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subject Breakdown</CardTitle>
                <CardDescription>
                  Detailed view of subject requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.subjectDistribution.map((subject, index) => (
                  <div key={subject.subject} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm font-medium">{subject.subject}</span>
                    </div>
                    <Badge variant="secondary">{subject.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeslots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Slot Analysis</CardTitle>
              <CardDescription>
                Demand vs availability across different time slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.timeSlotAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="demand" fill="#ff7c7c" name="Demand" />
                  <Bar dataKey="availability" fill="#8dd1e1" name="Availability" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 