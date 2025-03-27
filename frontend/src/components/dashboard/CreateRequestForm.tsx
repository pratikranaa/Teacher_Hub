import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

export function CreateRequestForm() {
  return (
    <ScrollArea className="h-[500px] w-full rounded-md border border-black p-4 bg-white text-black">
      <form>
        <div className="grid grid-cols-1 gap-4">
          {/* School */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="school" className="text-black">School</Label>
            <Input 
              id="school" 
              type="text" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Requested By */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="requested-by" className="text-black">Requested By</Label>
            <Input 
              id="requested-by" 
              type="text" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject" className="text-black">Subject</Label>
            <Input 
              id="subject" 
              type="text" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Grade */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="grade" className="text-black">Grade</Label>
            <Input 
              id="grade" 
              type="text" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="section" className="text-black">Section</Label>
            <Input 
              id="section" 
              type="text" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="date" className="text-black">Date</Label>
            <Input 
              id="date" 
              type="date" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-time" className="text-black">Start Time</Label>
            <Input 
              id="start-time" 
              type="time" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="end-time" className="text-black">End Time</Label>
            <Input 
              id="end-time" 
              type="time" 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority" className="text-black">Priority</Label>
            <Select>
              <SelectTrigger className="w-full bg-white text-black border-black">
                <SelectValue placeholder="Select Priority" className="text-black" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="low" className="text-black hover:bg-gray-100">Low</SelectItem>
                <SelectItem value="medium" className="text-black hover:bg-gray-100">Medium</SelectItem>
                <SelectItem value="high" className="text-black hover:bg-gray-100">High</SelectItem>
                <SelectItem value="urgent" className="text-black hover:bg-gray-100">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mode" className="text-black">Mode</Label>
            <Select>
              <SelectTrigger className="w-full bg-white text-black border-black">
                <SelectValue placeholder="Select Mode" className="text-black" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="online" className="text-black hover:bg-gray-100">Online</SelectItem>
                <SelectItem value="offline" className="text-black hover:bg-gray-100">Offline</SelectItem>
                <SelectItem value="hybrid" className="text-black hover:bg-gray-100">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-black">Description</Label>
            <Textarea 
              id="description" 
              rows={4} 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          {/* Requirements */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="requirements" className="text-black">Requirements</Label>
            <Textarea 
              id="requirements" 
              rows={4} 
              required 
              className="bg-white text-black border-black focus:border-black focus:ring-black" 
            />
          </div>

          <Button 
            type="submit" 
            className="mt-4 w-full bg-black text-white hover:bg-gray-800"
          >
            Submit Request
          </Button>
        </div>
      </form>
    </ScrollArea>
  )
}