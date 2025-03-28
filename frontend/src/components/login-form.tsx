"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import axiosInstance from "@/lib/axios"

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await axiosInstance.post('/login/', formData);
      const data = await response.data;

      // Store tokens and user data in localStorage
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('userData', JSON.stringify({
        userId: data.user_id,
        username: data.username,
        email: data.email,
        userType: data.user_type,
        profileCompleted: data.profile_completed,
        verificationStatus: data.profile_verification_status
      }));

      toast({
        title: "Login successful",
        description: "You have been successfully logged in.",
      });

      // In your login form after successful login
      document.cookie = `userData=${JSON.stringify({
        userId: data.user_id,
        username: data.username,
        email: data.email,
        userType: data.user_type,
        profileCompleted: data.profile_completed,
        verificationStatus: data.profile_verification_status
      })}; path=/;`
  
      // Handle redirection based on profile completion and verification status
      if (!data.profile_completed) {
        router.push('/profile-completion');
      } else if (data.profile_verification_status === 'PENDING') {
        router.push('/verification-pending');
      } else if (data.profile_verification_status === 'REJECTED') {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Your profile verification was rejected. Please contact support.",
        });
        router.push('/verification-rejected');
      } else if (data.profile_verification_status === 'VERIFIED') {
        if (data.user_type === 'SCHOOL_ADMIN' || data.user_type === 'PRINCIPAL') {
          router.push('/dashboard-school');
        }
        if (data.user_type === 'INTERNAL_TEACHER' || data.user_type === 'EXTERNAL_TEACHER') {
          router.push('/dashboard-teacher');
        }
        if (data.user_type === 'STUDENT') {
          router.push('/dashboard-student');
        }
      } else {
        router.push('/');
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your TeacherHub account
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="username@example.com"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pr-14"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    className="absolute inset-y-0 right-0 px-3 text-sm underline-offset-2 hover:underline"
                  >
                    Show
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/Teacherhub_login.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}