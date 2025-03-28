import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AvailabilityForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    subjects: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const accessToken = localStorage.getItem("accessToken")
    if (!accessToken) {
      setMessage("Authentication error: No access token found.")
      setLoading(false)
      return
    }

    // Convert subjects to an object: "Math, Science" → { "Math": "Math", "Science": "Science" }
    const formattedSubjects = formData.subjects
      .split(",")
      .map((subject) => subject.trim())
      .reduce((acc, subject) => {
        if (subject) acc[subject] = subject
        return acc
      }, {} as Record<string, string>)

    const payload = {
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      preferred_subjects: formattedSubjects, // Correct API format
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/teacher-availability/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setMessage("Availability updated successfully.")
        setFormData({ date: "", start_time: "", end_time: "", subjects: "" })
      } else {
        const errorData = await response.json()
        setMessage(`Error: ${errorData.detail || "Failed to update availability"}`)
      }
    } catch (error) {
      setMessage("Network error. Please try again.")
    }

    setLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Availability Form</CardTitle>
          <CardDescription>Enter your availability for the classes</CardDescription>
        </CardHeader>
        <CardContent>
          {message && <p className="mb-2 text-red-500">{message}</p>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" name="start_time" type="time" value={formData.start_time} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input id="end_time" name="end_time" type="time" value={formData.end_time} onChange={handleChange} required />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="subjects">Subjects (Comma-separated)</Label>
              <Input 
                id="subjects" 
                name="subjects" 
                type="text" 
                placeholder="Enter subjects (e.g., Math, Science)" 
                value={formData.subjects} 
                onChange={handleChange} 
                required 
              />
            </div>
            <Button type="submit" className="mt-6 w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Availability"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
