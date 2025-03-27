"use client"

import { useState } from "react";
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

export default function Page() {
  const [requests, setRequests] = useState([
    { id: 1, teacher: "Rahul Kumar", subject: "Computer Science", status: "Pending", date: "2024-03-27" },
    { id: 2, teacher: "Krishna Sharma", subject: "Mathematics", status: "Approved", date: "2024-03-26" },
  ]);
  const [teachers, setTeachers] = useState([
    { id: 1, name: "Rahul Kumar", email: "rahul@example.com", subject: "Computer Science", availability: "Full-time" },
    { id: 2, name: "Krishna Sharma", email: "krishna@example.com", subject: "Mathematics", availability: "Part-time" },
  ]);

  // State for selected record in Sheet
  const [selectedRecord, setSelectedRecord] = useState(null);

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
                  <BreadcrumbPage className="line-clamp-1 text-3xl font-bold">
                    School Admin Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
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
                      <span className={`px-2 py-1 rounded ${teacher.availability === "Full-time" ? "bg-black text-white" : "bg-gray-200"}`}>{teacher.availability}</span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {/* View Details Button - Opens Sheet */}
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecord(teacher)}
                          >
                            View Details
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Teacher Details</SheetTitle>
                            <SheetDescription>
                              View the details of this teacher.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="p-4 space-y-2">
                            <p><strong>Name:</strong> {selectedRecord?.name}</p>
                            <p><strong>Email:</strong> {selectedRecord?.email}</p>
                            <p><strong>Subject:</strong> {selectedRecord?.subject}</p>
                            <p><strong>Availability:</strong> {selectedRecord?.availability}</p>
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

        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}