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
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Availability Form</CardTitle>
          <CardDescription>
            Enter your availability for the classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid grid-cols-3 gap-4">
              {/* Date Column */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" required />
              </div>

              {/* Start Time Column */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input id="start-time" type="time" required />
              </div>

              {/* End Time Column */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input id="end-time" type="time" required />
              </div>
            </div>

            <Button type="submit" className="mt-6 w-full">
              Submit Availability
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}