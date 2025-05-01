"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Check, ClipboardCheck, Clock, Loader2, Plus, RefreshCw, Search, Trash, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDisplay } from "@/components/dashboard/UserDisplay";
import { isAuthenticated } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/use-auth";

// Import Sheet Component
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { SchoolNotificationCenter } from "./components/notification-center-school";
import { useUserData } from "@/hooks/use-userdata";
import { useToast } from "@/hooks/use-toast";
import { BASE_API_URL } from "@/lib/config";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CreateRequestForm } from "@/components/dashboard/CreateRequestForm";
import { Skeleton } from "@/components/ui/skeleton";

// Define interfaces for our data types
interface SubstituteRequest {
  id: string;
  subject: string;
  grade: string;
  section: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  requested_by: string | {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  assigned_teacher?: string | {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  mode: string;
  priority: string;
  description: string;
  school: string | {
    id: string;
    name: string;
  };
  meeting_link?: string;
  host_link?: string;
  created_at: string;
  invitations?: any[];
}

interface Teacher {
  id: number;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  };
  subjects: string[];
  qualification: string;
  experience_years: number;
  preferred_classes: string[];
  teaching_methodology: string;
  languages: string[];
  availability_status: string;
  can_teach_online: boolean;
  can_travel: boolean;
  hourly_rate: number;
  rating: number;
}

interface PendingProfile {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  teacher_profile?: any;
  student_profile?: any;
  school_staff_profile?: any;
}

export default function Page() {
  // Client-side auth protection
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  
  // Additional direct auth check when the component mounts
  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("User not authenticated in dashboard-school, redirecting to login");
      router.push('/login');
    }
  }, [router]);

  // State for data tables
  const [requests, setRequests] = useState<SubstituteRequest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  
  // Loading states
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  
  // UI states
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterTeacherName, setFilterTeacherName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { userData, isLoading: userLoading } = useUserData();
  const { toast } = useToast();

  // Fetch school substitute requests
  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_API_URL}/api/substitute-requests/school_requests/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch substitute requests");
      }

      const data = await response.json();
      console.log("Fetched requests data:", data);
      
      // Check if the data has the expected structure
      if (data.length > 0) {
        const exampleRequest = data[0];
        console.log("Example request requested_by:", exampleRequest.requested_by);
        console.log("Example request assigned_teacher:", exampleRequest.assigned_teacher);
      }
      
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load substitute requests",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Fetch school teachers
  const fetchTeachers = async () => {
    try {
      setIsLoadingTeachers(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_API_URL}/api/teacher-profiles/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast({
        title: "Error",
        description: "Failed to load teachers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // Fetch pending verification profiles
  const fetchPendingProfiles = async () => {
    try {
      setIsLoadingProfiles(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_API_URL}/api/profiles/pending-verification/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending profiles");
      }

      const data = await response.json();
      setPendingProfiles(Array.isArray(data) ? data : Object.values(data));
    } catch (error) {
      console.error("Error fetching pending profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load pending verification profiles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRequests(),
      fetchTeachers(),
      fetchPendingProfiles()
    ]);
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "All data has been updated",
    });
  };

  // Function to approve a teacher profile
  const approveProfile = async (username: string) => {
    setIsApproving(username);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_API_URL}/api/profile/verify/${username}/`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        throw new Error("Failed to approve profile");
      }

      // Refresh the pending profiles after approval
      const updatedProfiles = pendingProfiles.filter(profile => profile.username !== username);
      setPendingProfiles(updatedProfiles);
      
      toast({
        title: "Profile Approved",
        description: `Profile for ${username} has been approved successfully`,
      });
    } catch (error) {
      console.error("Failed to approve profile:", error);
      toast({
        title: "Error",
        description: "Failed to approve profile",
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
    fetchTeachers();
    fetchPendingProfiles();
  }, []);

  // Filter substitute requests
  const filteredRequests = requests.filter(request => {
    let matches = true;
    
    if (filterSubject && !request.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
      matches = false;
    }
    
    // Only filter by status if the value is not "all"
    if (filterStatus !== "all" && request.status !== filterStatus) {
      matches = false;
    }
    
    if (filterDate) {
      const requestDate = new Date(request.date);
      const filterDateObj = new Date(filterDate);
      if (
        requestDate.getDate() !== filterDateObj.getDate() ||
        requestDate.getMonth() !== filterDateObj.getMonth() ||
        requestDate.getFullYear() !== filterDateObj.getFullYear()
      ) {
        matches = false;
      }
    }
    
    return matches;
  });

  // Paginate filtered requests
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, filterStatus, filterDate]);

  // Filter teachers
  const filteredTeachers = teachers.filter(teacher => {
    if (!filterTeacherName) return true;
    
    const fullName = `${teacher.user.first_name} ${teacher.user.last_name}`.toLowerCase();
    const email = teacher.user.email.toLowerCase();
    const searchTerm = filterTeacherName.toLowerCase();
    
    return fullName.includes(searchTerm) || email.includes(searchTerm);
  });

  // Helper function to get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "AWAITING_ACCEPTANCE":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Awaiting</Badge>;
      case "ASSIGNED":
        return <Badge className="bg-green-500">Assigned</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper function to format user name
  const formatName = (user: any) => {
    if (!user) return "Not Assigned";
    
    // Output the user object for debugging
    console.log("Formatting user data:", user);
    
    // Check if user is just a string ID
    if (typeof user === 'string') {
      return `User ID: ${user}`;
    }
    
    // Check if we have a nested user object (common in Django REST)
    if (user.user) {
      const nestedUser = user.user;
      if (nestedUser.first_name && nestedUser.last_name) {
        return `${nestedUser.first_name} ${nestedUser.last_name}`;
      } else if (nestedUser.first_name) {
        return nestedUser.first_name;
      } else if (nestedUser.last_name) {
        return nestedUser.last_name;
      } else if (nestedUser.username) {
        return nestedUser.username;
      } else if (nestedUser.email) {
        return nestedUser.email.split('@')[0];
      }
    }
    
    // First priority: Show full name if available
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    }
    
    // Second priority: Show name property
    if (user.name) {
      return user.name;
    }
    
    // Third priority: Show username
    if (user.username) {
      return user.username;
    }
    
    // Fourth priority: Show email or email username portion
    if (user.email) {
      // Show email username without domain
      const username = user.email.split('@')[0];
      return username || user.email;
    }
    
    // Fallback with available info
    return user.id ? `User #${user.id}` : "Unknown User";
  };

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
                    {userLoading ? "Loading..." : `Welcome, ${userData?.first_name || userData?.username}`}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={refreshAllData}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <SchoolNotificationCenter />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto h-[100vh] w-full max-w-5xl rounded-xl bg-muted/5 space-y-5 p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">
                {userLoading ? "School Admin Dashboard" : `${userData?.school_name || "School"} Dashboard`}
              </h1>
              
              <Dialog open={createRequestOpen} onOpenChange={setCreateRequestOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-black text-white">
                    <Plus className="h-4 w-4 mr-2" /> Create Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Substitute Request</DialogTitle>
                    <DialogDescription>
                      Create a new substitute teacher request for your school
                    </DialogDescription>
                  </DialogHeader>
                  <CreateRequestForm onSuccess={() => {
                    setCreateRequestOpen(false);
                    fetchRequests();
                    toast({
                      title: "Success",
                      description: "Substitute request created successfully",
                    });
                  }} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Tabbed interface for the dashboard */}
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="requests">Substitute Requests</TabsTrigger>
                <TabsTrigger value="teachers">Teachers</TabsTrigger>
                <TabsTrigger value="verification">Pending Verification</TabsTrigger>
              </TabsList>
              
              {/* Substitute Requests Tab */}
              <TabsContent value="requests" className="pt-4">
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Substitute Requests</h2>
                    <div className="text-sm text-muted-foreground">
                      Total: {requests.length} | Pending: {requests.filter(r => r.status === "PENDING" || r.status === "AWAITING_ACCEPTANCE").length} | Assigned: {requests.filter(r => r.status === "ASSIGNED").length}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <Input 
                        placeholder="Filter by subject..." 
                        value={filterSubject} 
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="AWAITING_ACCEPTANCE">Awaiting Acceptance</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !filterDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filterDate}
                          onSelect={setFilterDate}
                          initialFocus
                        />
                        {filterDate && (
                          <div className="p-3 border-t border-border flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFilterDate(undefined)}
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {isLoadingRequests ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-muted-foreground mb-2">No substitute requests match your filters</p>
                          {(filterSubject || filterStatus || filterDate) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setFilterSubject("");
                                setFilterStatus("all");
                                setFilterDate(undefined);
                              }}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Requester</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedRequests.map((req) => (
                                <TableRow key={req.id}>
                                  <TableCell>{req.subject}</TableCell>
                                  <TableCell>{`${req.grade}-${req.section}`}</TableCell>
                                  <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                                  <TableCell>{`${req.start_time} - ${req.end_time}`}</TableCell>
                                  <TableCell>
                                    {typeof req.requested_by === 'string' ? (
                                      <UserDisplay userId={req.requested_by} fallbackText="Requester" />
                                    ) : (
                                      formatName(req.requested_by)
                                    )}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                                  <TableCell>
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedRecord(req)}
                                        >
                                          Details
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent className="sm:max-w-lg overflow-y-auto">
                                        <SheetHeader className="border-b pb-4">
                                          <div className="flex justify-between items-center">
                                            <SheetTitle>Substitute Request</SheetTitle>
                                            {selectedRecord && getStatusBadge(selectedRecord.status)}
                                          </div>
                                          <SheetDescription>
                                            ID: {selectedRecord?.id} - Created on {selectedRecord && new Date(selectedRecord.created_at).toLocaleString()}
                                          </SheetDescription>
                                        </SheetHeader>
                                        
                                        {selectedRecord && (
                                          <div className="py-4">
                                            <Tabs defaultValue="details">
                                              <TabsList className="w-full bg-muted">
                                                <TabsTrigger value="details">Details</TabsTrigger>
                                                <TabsTrigger value="invitations">
                                                  Invitations ({selectedRecord.invitations?.length || 0})
                                                </TabsTrigger>
                                                {selectedRecord.meeting_link && (
                                                  <TabsTrigger value="meeting">Meeting</TabsTrigger>
                                                )}
                                              </TabsList>

                                              <TabsContent value="details" className="mt-4 space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Subject</h3>
                                                    <p className="font-medium text-foreground">{selectedRecord.subject}</p>
                                                  </div>
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Grade & Section</h3>
                                                    <p className="font-medium text-foreground">{`${selectedRecord.grade}-${selectedRecord.section}`}</p>
                                                  </div>
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Date</h3>
                                                    <p className="font-medium text-foreground">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                                                  </div>
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Time</h3>
                                                    <p className="font-medium text-foreground">{`${selectedRecord.start_time} - ${selectedRecord.end_time}`}</p>
                                                  </div>
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Mode</h3>
                                                    <p className="font-medium text-foreground">{selectedRecord.mode}</p>
                                                  </div>
                                                  <div>
                                                    <h3 className="font-medium text-sm text-muted-foreground">Priority</h3>
                                                    <p className="font-medium text-foreground">{selectedRecord.priority}</p>
                                                  </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                  <h3 className="font-medium text-sm text-muted-foreground">Requested By</h3>
                                                  <div className="p-3 bg-secondary/15 rounded-md">
                                                    <div className="flex items-center justify-between">
                                                      <div>
                                                        {typeof selectedRecord.requested_by === 'string' ? (
                                                          <UserDisplay userId={selectedRecord.requested_by} fallbackText="Requester" />
                                                        ) : (
                                                          <>
                                                            <p className="font-medium text-foreground">{formatName(selectedRecord.requested_by)}</p>
                                                            <p className="text-sm text-muted-foreground">{selectedRecord.requested_by?.email || "No email available"}</p>
                                                          </>
                                                        )}
                                                      </div>
                                                      {selectedRecord.requested_by?.id && (
                                                        <Badge variant="secondary" className="ml-2">ID: {selectedRecord.requested_by.id}</Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {selectedRecord.assigned_teacher && (
                                                  <div className="space-y-2">
                                                    <h3 className="font-medium text-sm text-muted-foreground">Assigned Teacher</h3>
                                                    <div className="p-3 bg-secondary/15 rounded-md">
                                                      <div className="flex items-center justify-between">
                                                        <div>
                                                          {typeof selectedRecord.assigned_teacher === 'string' ? (
                                                            <UserDisplay userId={selectedRecord.assigned_teacher} fallbackText="Teacher" type="teacher" />
                                                          ) : (
                                                            <>
                                                              <p className="font-medium text-foreground">{formatName(selectedRecord.assigned_teacher)}</p>
                                                              <p className="text-sm text-muted-foreground">{selectedRecord.assigned_teacher.email || "No email available"}</p>
                                                            </>
                                                          )}
                                                        </div>
                                                        {selectedRecord.assigned_teacher.id && typeof selectedRecord.assigned_teacher !== 'string' && (
                                                          <Badge variant="secondary" className="ml-2">ID: {selectedRecord.assigned_teacher.id}</Badge>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {selectedRecord.description && (
                                                  <div className="space-y-2">
                                                    <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
                                                    <div className="p-3 bg-secondary/15 rounded-md">
                                                      <p className="whitespace-pre-wrap text-foreground">{selectedRecord.description}</p>
                                                    </div>
                                                  </div>
                                                )}
                                              </TabsContent>

                                              <TabsContent value="invitations" className="mt-4">
                                                {selectedRecord.invitations && selectedRecord.invitations.length > 0 ? (
                                                  <div className="space-y-3">
                                                    {selectedRecord.invitations.map((inv) => (
                                                      <Card key={inv.id} className="overflow-hidden border border-border">
                                                        <div className="p-4">
                                                          <div className="flex justify-between items-center mb-2">
                                                            <div>
                                                              <p className="font-medium text-foreground">{inv.teacher_details?.name || formatName(inv.teacher_details) || "Unknown"}</p>
                                                              <p className="text-sm text-muted-foreground">
                                                                {inv.teacher_details?.email || "No email available"}
                                                              </p>
                                                            </div>
                                                            <div>
                                                              {inv.status === "ACCEPTED" && <Badge className="bg-green-500">Accepted</Badge>}
                                                              {inv.status === "PENDING" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                                                              {inv.status === "DECLINED" && <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Declined</Badge>}
                                                              {inv.status === "WITHDRAWN" && <Badge variant="outline">Withdrawn</Badge>}
                                                            </div>
                                                          </div>
                                                          
                                                          <div className="text-sm mt-1">
                                                            <span className="text-muted-foreground">Invited: </span>
                                                            <span className="text-foreground">{new Date(inv.invited_at).toLocaleString()}</span>
                                                          </div>
                                                          
                                                          {inv.response_at && (
                                                            <div className="text-sm mt-1">
                                                              <span className="text-muted-foreground">Response: </span>
                                                              <span className="text-foreground">{new Date(inv.response_at).toLocaleString()}</span>
                                                            </div>
                                                          )}
                                                          
                                                          {inv.response_note && (
                                                            <div className="mt-2 p-2 bg-secondary/15 rounded-md">
                                                              <p className="text-sm text-foreground">{inv.response_note}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </Card>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-muted-foreground/20 rounded-lg">
                                                    <p className="text-muted-foreground">No invitations have been sent yet</p>
                                                  </div>
                                                )}
                                              </TabsContent>

                                              {selectedRecord.meeting_link && (
                                                <TabsContent value="meeting" className="mt-4 space-y-4">
                                                  <div className="space-y-2">
                                                    <h3 className="font-medium text-sm text-muted-foreground">Meeting Link (For Participants)</h3>
                                                    <div className="p-3 bg-secondary/10 rounded-md flex justify-between items-center">
                                                      <a 
                                                        href={selectedRecord.meeting_link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline overflow-hidden overflow-ellipsis"
                                                      >
                                                        {selectedRecord.meeting_link}
                                                      </a>
                                                      <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        onClick={() => {
                                                          navigator.clipboard.writeText(selectedRecord.meeting_link);
                                                          toast({
                                                            title: "Copied",
                                                            description: "Meeting link copied to clipboard"
                                                          });
                                                        }}
                                                      >
                                                        Copy
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  
                                                  {selectedRecord.host_link && (
                                                    <div className="space-y-2">
                                                      <h3 className="font-medium text-sm text-muted-foreground">Host Link (For Teachers)</h3>
                                                      <div className="p-3 bg-secondary/10 rounded-md flex justify-between items-center">
                                                        <a 
                                                          href={selectedRecord.host_link} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer"
                                                          className="text-green-600 hover:underline overflow-hidden overflow-ellipsis"
                                                        >
                                                          {selectedRecord.host_link}
                                                        </a>
                                                        <Button 
                                                          variant="secondary" 
                                                          size="sm"
                                                          onClick={() => {
                                                            navigator.clipboard.writeText(selectedRecord.host_link);
                                                            toast({
                                                              title: "Copied",
                                                              description: "Host link copied to clipboard"
                                                            });
                                                          }}
                                                        >
                                                          Copy
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </TabsContent>
                                              )}
                                            </Tabs>
                                          </div>
                                        )}
                                      </SheetContent>
                                    </Sheet>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((prev) => prev - 1)}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {currentPage} of {Math.ceil(filteredRequests.length / itemsPerPage)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === Math.ceil(filteredRequests.length / itemsPerPage)}
                              onClick={() => setCurrentPage((prev) => prev + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </Card>
              </TabsContent>
              
              {/* Teachers Tab */}
              <TabsContent value="teachers" className="pt-4">
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">School Teachers</h2>
                    <div className="text-sm text-muted-foreground">
                      Total: {teachers.length} | Available: {teachers.filter(t => t.availability_status === "AVAILABLE").length}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search teachers by name or email..." 
                      className="pl-10"
                      value={filterTeacherName}
                      onChange={(e) => setFilterTeacherName(e.target.value)}
                    />
                  </div>
                  
                  {isLoadingTeachers ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {filteredTeachers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-muted-foreground">No teachers match your search</p>
                          {filterTeacherName && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setFilterTeacherName("")}
                              className="mt-2"
                            >
                              Clear Search
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Subjects</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Availability</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTeachers.map((teacher) => (
                              <TableRow key={teacher.id}>
                                <TableCell>{`${teacher.user.first_name} ${teacher.user.last_name}`}</TableCell>
                                <TableCell>{teacher.user.email}</TableCell>
                                <TableCell>{teacher.subjects.slice(0, 2).join(", ")}{teacher.subjects.length > 2 ? "..." : ""}</TableCell>
                                <TableCell>{teacher.rating}/5</TableCell>
                                <TableCell>
                                  {teacher.availability_status === "AVAILABLE" ? (
                                    <Badge className="bg-green-500 text-white">Available</Badge>
                                  ) : (
                                    <Badge variant="outline">Unavailable</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedRecord(teacher)}
                                      >
                                        Details
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent>
                                      <SheetHeader>
                                        <SheetTitle>Teacher Profile</SheetTitle>
                                        <SheetDescription>
                                          View comprehensive teacher information
                                        </SheetDescription>
                                      </SheetHeader>
                                      
                                      {selectedRecord && (
                                        <div className="py-4 space-y-4">
                                          <div>
                                            <h3 className="font-medium">Personal Information</h3>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                              <div>
                                                <p className="text-sm text-muted-foreground">Name</p>
                                                <p>
                                                  {selectedRecord.user ? 
                                                    `${selectedRecord.user.first_name || ''} ${selectedRecord.user.last_name || ''}` : 
                                                    (selectedRecord.first_name ? 
                                                      `${selectedRecord.first_name || ''} ${selectedRecord.last_name || ''}` : 
                                                      selectedRecord.username || 'N/A')}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p>{selectedRecord.user?.email || selectedRecord.email || 'N/A'}</p>
                                              </div>
                                              {(selectedRecord.user?.phone_number || selectedRecord.phone_number) && (
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Phone</p>
                                                  <p>{selectedRecord.user?.phone_number || selectedRecord.phone_number}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {selectedRecord.subjects && (
                                          <div>
                                            <h3 className="font-medium">Teaching Information</h3>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                              {selectedRecord.subjects && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Subjects</p>
                                                <p>{selectedRecord.subjects.join(", ")}</p>
                                              </div>
                                              )}
                                              {selectedRecord.qualification && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Qualification</p>
                                                <p>{selectedRecord.qualification}</p>
                                              </div>
                                              )}
                                              {typeof selectedRecord.experience_years !== 'undefined' && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Experience</p>
                                                <p>{selectedRecord.experience_years} years</p>
                                              </div>
                                              )}
                                              {selectedRecord.preferred_classes && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Preferred Classes</p>
                                                <p>{selectedRecord.preferred_classes.join(", ")}</p>
                                              </div>
                                              )}
                                              {selectedRecord.languages && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Languages</p>
                                                <p>{selectedRecord.languages.join(", ")}</p>
                                              </div>
                                              )}
                                              {typeof selectedRecord.hourly_rate !== 'undefined' && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                                                <p>₹{selectedRecord.hourly_rate}</p>
                                              </div>
                                              )}
                                              {typeof selectedRecord.rating !== 'undefined' && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Rating</p>
                                                <p>{selectedRecord.rating}/5</p>
                                              </div>
                                              )}
                                              {selectedRecord.availability_status && (
                                              <div>
                                                <p className="text-sm text-muted-foreground">Availability</p>
                                                <p>
                                                  {selectedRecord.availability_status === "AVAILABLE" ? (
                                                    <span className="text-green-600 font-medium">Available</span>
                                                  ) : (
                                                    <span className="text-gray-500">Unavailable</span>
                                                  )}
                                                </p>
                                              </div>
                                              )}
                                            </div>
                                          </div>
                                          )}
                                          
                                          {selectedRecord.teaching_methodology && (
                                          <div>
                                            <h3 className="font-medium">Teaching Methodology</h3>
                                            <p className="mt-1 whitespace-pre-wrap">{selectedRecord.teaching_methodology}</p>
                                          </div>
                                          )}
                                          
                                          {(typeof selectedRecord.can_teach_online !== 'undefined' || typeof selectedRecord.can_travel !== 'undefined') && (
                                          <div className="grid grid-cols-2 gap-4">
                                            {typeof selectedRecord.can_teach_online !== 'undefined' && (
                                            <div>
                                              <h3 className="font-medium">Can Teach Online</h3>
                                              <p>{selectedRecord.can_teach_online ? "Yes" : "No"}</p>
                                            </div>
                                            )}
                                            {typeof selectedRecord.can_travel !== 'undefined' && (
                                            <div>
                                              <h3 className="font-medium">Can Travel</h3>
                                              <p>
                                                {selectedRecord.can_travel ? (
                                                  <>Yes, up to {selectedRecord.travel_radius} km</>
                                                ) : (
                                                  "No"
                                                )}
                                              </p>
                                            </div>
                                            )}
                                          </div>
                                          )}
                                        </div>
                                      )}
                                    </SheetContent>
                                  </Sheet>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </Card>
              </TabsContent>
              
              {/* Pending Verification Tab */}
              <TabsContent value="verification" className="pt-4">
                <Card className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold">Pending Verification</h2>
                  
                  {isLoadingProfiles ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {pendingProfiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-muted-foreground">No pending verification profiles</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingProfiles.map((profile) => (
                              <TableRow key={`${profile.id}-${profile.username}`}>
                                <TableCell>{profile.username}</TableCell>
                                <TableCell>
                                  {profile.first_name && profile.last_name 
                                    ? `${profile.first_name} ${profile.last_name}`
                                    : "N/A"}
                                </TableCell>
                                <TableCell>{profile.email}</TableCell>
                                <TableCell>{profile.phone_number || "N/A"}</TableCell>
                                <TableCell>
                                  {profile.user_type === "INTERNAL_TEACHER" && <Badge>Internal Teacher</Badge>}
                                  {profile.user_type === "EXTERNAL_TEACHER" && <Badge variant="outline">External Teacher</Badge>}
                                  {profile.user_type === "STUDENT" && <Badge variant="secondary">Student</Badge>}
                                  {!profile.user_type && <Badge variant="outline">Unknown</Badge>}
                                </TableCell>
                                <TableCell className="flex gap-2">
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedRecord(profile)}
                                      >
                                        Info
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent>
                                      <SheetHeader>
                                        <SheetTitle>Profile Details</SheetTitle>
                                        <SheetDescription>
                                          Review profile before verification
                                        </SheetDescription>
                                      </SheetHeader>
                                      
                                      {selectedRecord && (
                                        <div className="py-4 space-y-4">
                                          <div>
                                            <h3 className="font-medium">Basic Information</h3>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                              <div>
                                                <p className="text-sm text-muted-foreground">Username</p>
                                                <p>{selectedRecord.username}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p>{selectedRecord.email}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">Name</p>
                                                <p>
                                                  {selectedRecord.first_name && selectedRecord.last_name 
                                                    ? `${selectedRecord.first_name} ${selectedRecord.last_name}`
                                                    : "N/A"}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">Phone</p>
                                                <p>{selectedRecord.phone_number || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">User Type</p>
                                                <p>{selectedRecord.user_type || "N/A"}</p>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Teacher Profile Details */}
                                          {selectedRecord.teacher_profile && (
                                            <div>
                                              <h3 className="font-medium">Teacher Profile</h3>
                                              <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Subjects</p>
                                                  <p>{selectedRecord.teacher_profile.subjects?.join(", ") || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Qualification</p>
                                                  <p>{selectedRecord.teacher_profile.qualification || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Experience</p>
                                                  <p>{selectedRecord.teacher_profile.experience_years || "0"} years</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* Student Profile Details */}
                                          {selectedRecord.student_profile && (
                                            <div>
                                              <h3 className="font-medium">Student Profile</h3>
                                              <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Grade</p>
                                                  <p>{selectedRecord.student_profile.grade || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Section</p>
                                                  <p>{selectedRecord.student_profile.section || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-sm text-muted-foreground">Roll Number</p>
                                                  <p>{selectedRecord.student_profile.roll_number || "N/A"}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      <SheetFooter>
                                        <Button
                                          onClick={() => {
                                            if (selectedRecord) {
                                              approveProfile(selectedRecord.username);
                                            }
                                          }}
                                        >
                                          <Check className="h-4 w-4 mr-2" /> Approve Profile
                                        </Button>
                                      </SheetFooter>
                                    </SheetContent>
                                  </Sheet>

                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => approveProfile(profile.username)}
                                    disabled={isApproving === profile.username}
                                  >
                                    {isApproving === profile.username ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                      <ClipboardCheck className="h-4 w-4 mr-1" />
                                    )}
                                    Approve
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight userData={userData ? {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        avatar: userData.profile_image || "/avatars/shadcn.jpg"
      } : undefined} />
    </SidebarProvider>
  );
}

