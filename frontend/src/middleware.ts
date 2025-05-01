import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if user is authenticated by looking for userData in cookies
  const userData = request.cookies.get('userData')?.value
  
  // If no userData is found, redirect to login page
  if (!userData) {
    console.log("No userData found in cookies, redirecting to login page")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const user = JSON.parse(userData)

    // Handle different routes based on user status
    if (request.nextUrl.pathname === '/dashboard-school' || 
        request.nextUrl.pathname === '/dashboard-student' || 
        request.nextUrl.pathname === '/dashboard-teacher' || 
        request.nextUrl.pathname === '/dashboard' || 
        request.nextUrl.pathname.startsWith('/account')) {
      if (!user.profileCompleted) {
        return NextResponse.redirect(new URL('/profile-completion', request.url))
      }
      if (user.verificationStatus === 'PENDING') {
        return NextResponse.redirect(new URL('/verification-pending', request.url))
      }
      if (user.verificationStatus === 'REJECTED') {
        return NextResponse.redirect(new URL('/verification-rejected', request.url))
      }
      if (user.userType === 'SCHOOL' && request.nextUrl.pathname !== '/dashboard-school') {
        return NextResponse.redirect(new URL('/dashboard-school', request.url))
      }
      if (user.userType === 'STUDENT' && request.nextUrl.pathname !== '/dashboard-student') {
        return NextResponse.redirect(new URL('/dashboard-student', request.url))
      }
      if (user.userType === 'TEACHER' && request.nextUrl.pathname !== '/dashboard-teacher') {
        return NextResponse.redirect(new URL('/dashboard-teacher', request.url))
      }
    }
  } catch (error) {
    console.error("Error parsing userData from cookies:", error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

// Add all protected routes that require authentication to the matcher
export const config = {
  matcher: [
    '/dashboard', 
    '/dashboard/:path*',
    '/dashboard-school',
    '/dashboard-school/:path*',
    '/dashboard-student',
    '/dashboard-student/:path*',
    '/dashboard-teacher',
    '/dashboard-teacher/:path*',
    '/profile-completion', 
    '/verification-pending', 
    '/verification-rejected',
    '/account/:path*',
    '/(auth)/account/:path*'
  ]
}