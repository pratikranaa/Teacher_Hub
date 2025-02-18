
import { SignupForm } from "@/components/signup-form"
import { Metadata } from "next";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <SignupForm />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Login - Teacher Hub"
}
