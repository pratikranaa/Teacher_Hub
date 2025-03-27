"use client"

import Image from "next/image"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

// Sample data for 50 entries
const sessionData = Array.from({ length: 50 }, (_, index) => ({
  id: index + 1,
  topic: `Session Topic ${index + 1}`,
  subject: `Subject ${index + 1}`,
  class: `${10 + (index % 3)}th`, // Rotates between 10th, 11th, and 12th
  date: `March ${25 - (index % 25)}, 2025`, // Rotates dates
}))

export default function TaskPage() {
  const [filteredClass, setFilteredClass] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<string | null>(null)

  // Filter logic
  const filteredData = filteredClass && filteredClass !== "none"
    ? sessionData.filter((session) => session.class === filteredClass)
    : sessionData

  // Sort logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOption === "class-asc") {
      return a.class.localeCompare(b.class)
    } else if (sortOption === "class-desc") {
      return b.class.localeCompare(a.class)
    } else if (sortOption === "date-asc") {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    } else if (sortOption === "date-desc") {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return 0
  })

  return (
    <>
      <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Session History</h2>
            <p className="text-muted-foreground">
              Here&apos;s a list of all the session recordings for your school.
            </p>
          </div>
          {/* Filter and Sort Components */}
          <div className="flex space-x-4">
            {/* Filter by Class */}
            <Select onValueChange={(value) => setFilteredClass(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Filter by Class</SelectItem>
                <SelectItem value="10th">10th</SelectItem>
                <SelectItem value="11th">11th</SelectItem>
                <SelectItem value="12th">12th</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort by Class or Date */}
            <Select onValueChange={(value) => setSortOption(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class-asc">Class (Ascending)</SelectItem>
                <SelectItem value="class-desc">Class (Descending)</SelectItem>
                <SelectItem value="date-asc">Date (Ascending)</SelectItem>
                <SelectItem value="date-desc">Date (Descending)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Session History Table */}
        <Table>
          <TableCaption>A list of all session recordings.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[200px]">Topic</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.id}</TableCell>
                <TableCell>{session.topic}</TableCell>
                <TableCell>{session.subject}</TableCell>
                <TableCell>{session.class}</TableCell>
                <TableCell>{session.date}</TableCell>
                <TableCell className="text-center">
                  <Sheet>
                    <SheetTrigger>
                      <button className="mr-2 text-blue-500 hover:underline">Play</button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="w-full h-full">
                      <SheetHeader>
                        <SheetTitle>{session.topic}</SheetTitle>
                        <SheetDescription>
                          Recording from {session.date}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 flex flex-col items-center">
                        <Image
                          src="/maxresdefault.jpg" // Replace with your placeholder image path
                          alt="Recording Thumbnail"
                          width={900}
                          height={600}
                          className="rounded-md"
                        />
                        <div className="mt-4 flex space-x-4">
                          <button className="px-4 py-2 bg-blue-500 text-white rounded-md">
                            Play
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-md">
                            Pause
                          </button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <button className="text-blue-500 hover:underline">Download</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}