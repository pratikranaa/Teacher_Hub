import { GalleryVerticalEnd } from "lucide-react"
import { DynamicProfileForm } from "@/components/form-2"

export default function ProfileCompletionPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/2 p-6 md:p-10">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Teacher Hub Profile Completion
        </a>
        <DynamicProfileForm />
      </div>
    </div>
  )
}