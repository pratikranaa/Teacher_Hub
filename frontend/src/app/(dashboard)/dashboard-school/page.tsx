"use client"

import { useState, useEffect } from "react";
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
import { Trash } from "lucide-react";

// Import Sheet Component
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SchoolNotificationCenter } from "./components/notification-center-school";
import { useUserData } from "@/hooks/use-userdata"



export default function Page() {
  const [requests, setRequests] = useState([
    { id: 1, teacher: "Rahul Kumar", subject: "Computer Science", status: "Pending", date: "2024-03-27" },
    { id: 2, teacher: "Krishna Sharma", subject: "Mathematics", status: "Approved", date: "2024-03-26" },
  ]);
  const [teachers, setTeachers] = useState([]);
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { userData, isLoading: userLoading } = useUserData()







  // Modify the useEffect hook to include an interval
  useEffect(() => {
    const fetchPendingProfiles = async () => {
      try {
        const token = localStorage.getItem("accessToken");
  
        const response = await fetch("http://127.0.0.1:8000/api/profiles/pending-verification/", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });
  
        interface Profile {
          id: number;
          username: string;
          email: string;
          phone_number: string;
        }

        const data = await response.json();
  
        if (data && typeof data === 'object') {
          const profilesArray = Object.values(data as Record<string, Profile>).map((profile) => ({
            id: profile.id,
            username: profile.username,
            email: profile.email,
            phone_number: profile.phone_number,
          }));
          setPendingProfiles(profilesArray);
        } else {
          console.error("Expected an object but got:", data);
          setPendingProfiles([]);
        }
      } catch (error) {
        console.error("Failed to fetch pending profiles:", error);
        setPendingProfiles([]);
      }
    };

    const fetchTeachers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch("http://127.0.0.1:8000/api/teacher-profiles/", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`, // Include the token in the header
            "Content-Type": "application/json",
          },
          credentials: "include", // Send cookies with the request 
        });

        const data = await response.json();
        
        // Extract relevant data and update the state
        setTeachers(data.map(teacher => ({
          id: teacher.id,
          name: `${teacher.user.first_name} ${teacher.user.last_name}`,
          email: teacher.user.email,
          subject: teacher.subjects.length > 0 ? teacher.subjects[0] : "N/A", 
          availability: teacher.availability_status,
          details: teacher // Store the entire teacher object for details
        })));
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      }
    };
  
    // Initial fetch
    fetchPendingProfiles();
    fetchTeachers();
  
    // Set up interval to fetch every 3 seconds
    const intervalId = setInterval(fetchPendingProfiles, 3000);
  
    // Cleanup function to clear interval when component unmounts
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this effect runs once on mount

  // Function to approve a teacher profile
  const approveProfile = async (username) => {
    const token = localStorage.getItem("accessToken"); 
    const response = await fetch(`http://127.0.0.1:8000/api/profile/verify/${username}/`, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`, // Include the token in the header
        "Content-Type": "application/json"
      },
      credentials: "include" // Include cookies if needed
    });

    if (response.ok) {
      // Refresh the pending profiles after approval
      const updatedProfiles = pendingProfiles.filter(profile => profile.username !== username);
      setPendingProfiles(updatedProfiles);
    } else {
      console.error("Failed to approve profile");
    }
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
            <SchoolNotificationCenter />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 ">
          <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/5 space-y-5 p-4">
            <h1 className="text-2xl font-bold">
              {userLoading ? "School Admin Dashboard" : `${userData?.school_name || "School"} Dashboard`}
            </h1>

            {/* Substitute Requests */}
            <Card className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">Substitute Requests</h2>
              <div className="flex gap-4">
                <Input placeholder="Teacher Name" />
                <Input placeholder="Subject" />
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-black text-white">Create Request</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.teacher}</TableCell>
                      <TableCell>{req.subject}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded ${req.status === "Approved" ? "bg-black text-white" : "bg-gray-200"}`}>{req.status}</span>
                      </TableCell>
                      <TableCell>{req.date}</TableCell>
                      <TableCell className="flex gap-2">
                        {/* View Details Button - Opens Sheet */}
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(req)}
                            >
                              View Details
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Request Details</SheetTitle>
                              <SheetDescription>
                                View the details of the substitute request.
                              </SheetDescription>
                            </SheetHeader>
                            <div className="p-4 space-y-2">
                              <p><strong>Teacher:</strong> {selectedRecord?.teacher}</p>
                              <p><strong>Subject:</strong> {selectedRecord?.subject}</p>
                              <p><strong>Status:</strong> {selectedRecord?.status}</p>
                              <p><strong>Date:</strong> {selectedRecord?.date}</p>
                            </div>
                          </SheetContent>
                        </Sheet>

                        <Button variant="destructive" size="icon">
                          <Trash size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* School Teachers */}
            <Card className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">School Teachers</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.subject}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded ${teacher.availability === "AVAILABLE" ? "bg-black text-white" : "bg-gray-200"}`}>{teacher.availability}</span>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {/* View Details Button - Opens Sheet */}
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(teacher.details)}
                            >
                              View Details
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Teacher Details</SheetTitle>
                            </SheetHeader>
                            <div className="p-4 space-y-2">
                              <pre>{JSON.stringify(selectedRecord, null, 2)}</pre> {/* Display the full details */}
                            </div>
                          </SheetContent>
                        </Sheet>

                        <Button variant="destructive" size="icon">
                          <Trash size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Pending Verification Section */}
            <Card className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">Pending Verification</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {pendingProfiles.map((profile) => (
                      <TableRow key={`${profile.id}-${profile.username}`}>
                        <TableCell>{profile.username}</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.phone_number}</TableCell>
                        <TableCell className="flex gap-2">
                          {/* Info Button - Opens Sheet */}
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
                                  View the details of this profile.
                                </SheetDescription>
                              </SheetHeader>
                              <div className="p-4 space-y-2">
                                <pre>{JSON.stringify(profile, null, 2)}</pre>
                              </div>
                            </SheetContent>
                          </Sheet>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => approveProfile(profile.username)}
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

              </Table>
            </Card>

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

