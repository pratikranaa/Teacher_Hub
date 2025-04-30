"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/hooks/use-userdata"
import { fetchSessionRecordings, fetchRecordingUrl, playRecording, downloadRecording } from "@/lib/api"
import { Loader2, Download, ExternalLink } from "lucide-react"

export default function SessionHistoryPage() {
  const { userData, isLoading: userLoading } = useUserData()
  const { toast } = useToast()
  const [filteredClass, setFilteredClass] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<string | null>("date-desc")
  const [filteredSubject, setFilteredSubject] = useState<string | null>(null)
  const [recordings, setRecordings] = useState([])
  const [subjects, setSubjects] = useState([])
  const [grades, setGrades] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<any>(null)
  const [playbackUrl, setPlaybackUrl] = useState("")
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null)

  // Fetch recordings when component mounts
  useEffect(() => {
    fetchRecordingsData();
  }, []);

  // Function to fetch recordings from API
  const fetchRecordingsData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchSessionRecordings();
      setRecordings(data);
      
      // Extract unique subjects and grades for filters
      const uniqueSubjects = [...new Set(data.map(rec => rec.session_details?.subject))].filter(Boolean);
      const uniqueGrades = [...new Set(data.map(rec => rec.session_details?.grade))].filter(Boolean);
      
      setSubjects(uniqueSubjects);
      setGrades(uniqueGrades);
    } catch (error) {
      console.error("Error fetching session recordings:", error);
      toast({
        title: "Error",
        description: "Failed to load session recordings. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle playing a recording
  const handlePlayRecording = async (recording) => {
    try {
      setSelectedRecording(recording);
      setPlaybackLoading(true);
      setActiveRecordingId(recording.id);
      
      const data = await fetchRecordingUrl(recording.id);
      setPlaybackUrl(data.recording_url);
      
      // Auto-play the recording in a new window
      if (data.recording_url) {
        playRecording(data.recording_url, null);
      }
    } catch (error) {
      console.error("Error fetching recording URL:", error);
      toast({
        title: "Recording Not Available",
        description: "The recording might still be processing or isn't available yet.",
        variant: "destructive"
      });
    } finally {
      setPlaybackLoading(false);
    }
  };

  // Handle downloading a recording
  const handleDownloadRecording = async (recording) => {
    try {
      setActiveRecordingId(recording.id);
      setPlaybackLoading(true);
      
      const data = await fetchRecordingUrl(recording.id);
      
      if (data.recording_url) {
        // Generate filename based on session details
        const sessionDate = recording.session_details?.date || new Date().toISOString().split('T')[0];
        const subject = recording.session_details?.subject || 'Unknown';
        const grade = recording.session_details?.grade || '';
        const filename = `${subject}_${grade}_${sessionDate}.mp4`;
        
        await downloadRecording(data.recording_url, null, filename);
        
        toast({
          title: "Success",
          description: "Download started successfully",
        });
      } else {
        throw new Error("Recording not available");
      }
    } catch (error) {
      console.error("Error downloading recording:", error);
      toast({
        title: "Error",
        description: "Failed to download recording. It might still be processing.",
        variant: "destructive"
      });
    } finally {
      setActiveRecordingId(null);
      setPlaybackLoading(false);
    }
  };

  // Filter recordings based on subject and grade
  const filteredRecordings = recordings.filter(recording => {
    const matchesSubject = !filteredSubject || 
      recording.session_details?.subject === filteredSubject;
    
    const matchesGrade = !filteredClass || 
      recording.session_details?.grade === filteredClass;
    
    return matchesSubject && matchesGrade;
  });

  // Sort recordings based on selected option
  const sortedRecordings = [...filteredRecordings].sort((a, b) => {
    if (sortOption === "date-asc") {
      return new Date(a.session_details?.date || 0).getTime() - new Date(b.session_details?.date || 0).getTime();
    } else if (sortOption === "date-desc") {
      return new Date(b.session_details?.date || 0).getTime() - new Date(a.session_details?.date || 0).getTime();
    } else if (sortOption === "class-asc") {
      return (a.session_details?.grade || '').localeCompare(b.session_details?.grade || '');
    } else if (sortOption === "class-desc") {
      return (b.session_details?.grade || '').localeCompare(a.session_details?.grade || '');
    }
    
    return 0;
  });

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
                    {userLoading ? "Session History" : `Session History - ${userData?.first_name || userData?.username}`}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex h-full flex-1 flex-col space-y-8 p-8">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Session History</h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of all the session recordings for your school.
              </p>
            </div>
            
            {/* Filter and Sort Components */}
            <div className="flex space-x-4">
              {/* Filter by Subject */}
              <Select onValueChange={(value) => setFilteredSubject(value === 'none' ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Class */}
              <Select onValueChange={(value) => setFilteredClass(value === 'none' ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Classes</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort options */}
              <Select defaultValue="date-desc" onValueChange={(value) => setSortOption(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="class-asc">Class (A-Z)</SelectItem>
                  <SelectItem value="class-desc">Class (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin opacity-50" />
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && sortedRecordings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium">No recordings found</p>
              <p className="text-sm text-muted-foreground">
                There are no recordings matching your filters or you don't have any recordings yet.
              </p>
            </div>
          )}

          {/* Session History Table */}
          {!isLoading && sortedRecordings.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableCaption>A list of all session recordings.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRecordings.map((recording, index) => {
                    const details = recording.session_details || {};
                    const displayDate = details.date ? new Date(details.date).toLocaleDateString() : 'N/A';
                    
                    return (
                      <TableRow key={recording.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{details.subject || 'N/A'}</TableCell>
                        <TableCell>{details.grade || 'N/A'}</TableCell>
                        <TableCell>{details.teacher_name || 'N/A'}</TableCell>
                        <TableCell>{displayDate}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={recording.status === 'COMPLETED' ? "default" : "outline"}
                            className={recording.status === 'STARTED' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}
                          >
                            {recording.status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center space-x-2">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button 
                                variant="outline"
                                size="sm"
                                disabled={recording.status !== 'COMPLETED' || activeRecordingId === recording.id}
                                onClick={() => handlePlayRecording(recording)}
                                className="mr-2"
                              >
                                {activeRecordingId === recording.id && playbackLoading ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                )}
                                Play
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>{details.subject || 'Recording'} - {details.grade || 'Session'}</SheetTitle>
                                <SheetDescription>
                                  Recording from {displayDate}
                                </SheetDescription>
                              </SheetHeader>
                              
                              <div className="mt-4 p-4">
                                {playbackLoading ? (
                                  <div className="flex flex-col items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                    <p>Loading recording...</p>
                                  </div>
                                ) : playbackUrl ? (
                                  <div className="text-center">
                                    <p className="mb-4">Recording opened in a new window.</p>
                                    <Button onClick={() => handlePlayRecording(selectedRecording)}>
                                      Open Again
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <p className="mb-4">Recording not available yet or still processing.</p>
                                    <Button onClick={() => handlePlayRecording(selectedRecording)}>
                                      Try Again
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                          
                          <Button 
                            variant="outline"
                            size="sm"
                            disabled={recording.status !== 'COMPLETED' || activeRecordingId === recording.id}
                            onClick={() => handleDownloadRecording(recording)}
                          >
                            {activeRecordingId === recording.id && playbackLoading ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SidebarInset>
      <SidebarRight userData={userData ? {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        avatar: userData.profile_image || "/avatars/shadcn.jpg"
      } : undefined} />
    </SidebarProvider>
  )
}