import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"

const BASE_API_URL = "http://127.0.0.1:8000"

// Form schema validation
const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  grade: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  priority: z.string().min(1, "Priority is required"),
  mode: z.string().min(1, "Mode is required"),
  description: z.string().min(10, "Please provide at least 10 characters"),
  requirements: z.string().optional(),
  special_instructions: z.string().optional(),
})

// Add interface for form options
interface FormOptions {
  subjects: Record<string, string>;
  grades: Record<string, string>;
  sections: Record<string, string>;
  priorities: Record<string, string>;
  modes: Record<string, string>;
}


export function CreateRequestForm({ onClose }: { onClose?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const { toast } = useToast()

  // Fetch form options from backend
  useEffect(() => {  
  const fetchFormOptions = async () => {
    try {
      const response = await fetch(BASE_API_URL + "/api/substitute-form-options/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load form options");
      }
      
      const data = await response.json();
      setFormOptions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load form options. Please refresh the page.",
        variant: "destructive",
      });
      console.error("Error loading form options:", error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  fetchFormOptions();
}, [toast]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      grade: "",
      section: "A",
      date: "",
      start_time: "",
      end_time: "",
      priority: "MEDIUM",
      mode: "ONLINE",
      description: "",
      requirements: "",
      special_instructions: "",
    },
  })






  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      const requestBody = {
        ...data
      }
      
      console.log("Sending request data:", requestBody);
      
      const response = await fetch(BASE_API_URL+"/api/substitute-requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify(requestBody),
      })
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.detail || "Failed to create request");
      }
  
      const result = await response.json()
      
      toast({
        title: isDraft ? "Draft saved" : "Request submitted",
        description: isDraft ? 
          "Your request draft has been saved successfully." : 
          "Your substitute request has been submitted and teachers are being notified.",
        variant: "default",
      })
      
      form.reset()
      
      // Close the side sheet if not in draft mode and onClose is provided
      if (!isDraft && onClose) {
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  const handleSaveDraft = async () => {
    setIsDraft(true);
    await form.handleSubmit(onSubmit)();
  }

    // Update the JSX to use dynamic options
    if (isLoadingOptions) {
      return (
        <div className="flex justify-center items-center h-[500px] border rounded-md p-4">
          <Loader2 className="h-8 w-8 animate-spin text-black" />
          <p className="ml-2 text-black">Loading form options...</p>
        </div>
      )
    }
  

    return (
      <ScrollArea className="h-[500px] w-full rounded-md border border-black p-4 bg-white text-black">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">  

            {/* Subject - Now using dynamic options */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Subject</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white text-black border-black">
                        <SelectValue placeholder="Select Subject" className="text-black" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black">
                      {formOptions && Object.entries(formOptions.subjects).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-black hover:bg-gray-100">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grade - Now using dynamic options */}
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Grade</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white text-black border-black">
                        <SelectValue placeholder="Select Grade" className="text-black" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black">
                      {formOptions && Object.entries(formOptions.grades).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-black hover:bg-gray-100">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            
            {/* Section - Now using dynamic options */}
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Section</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white text-black border-black">
                        <SelectValue placeholder="Select Section" className="text-black" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black">
                      {formOptions && Object.entries(formOptions.sections).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-black hover:bg-gray-100">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Date</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="date"
                      className="bg-white text-black border-black focus:border-black" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Time */}
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Start Time</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="time"
                      className="bg-white text-black border-black focus:border-black" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Time */}
            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">End Time</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="time"
                      className="bg-white text-black border-black focus:border-black" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority - Now using dynamic options */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Priority</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white text-black border-black">
                        <SelectValue placeholder="Select Priority" className="text-black" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black">
                      {formOptions && Object.entries(formOptions.priorities).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-black hover:bg-gray-100">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode - Now using dynamic options */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Mode</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white text-black border-black">
                        <SelectValue placeholder="Select Mode" className="text-black" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white text-black">
                      {formOptions && Object.entries(formOptions.modes).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-black hover:bg-gray-100">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Description</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    rows={4}
                    className="bg-white text-black border-black focus:border-black" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Requirements */}
          <FormField
            control={form.control}
            name="requirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Requirements</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    rows={3}
                    className="bg-white text-black border-black focus:border-black" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Special Instructions */}
          <FormField
            control={form.control}
            name="special_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Special Instructions</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    rows={4}
                    placeholder="Any special instructions for the substitute teacher..."
                    className="bg-white text-black border-black focus:border-black" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
              Save Draft
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
          </form>
      </Form>
    </ScrollArea>
  )
}