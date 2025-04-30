import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userData = request.cookies.get('userData')?.value
  
  if (!userData) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = JSON.parse(userData)

  // Handle different routes based on user status
  if (request.nextUrl.pathname === '/dashboard-school' || request.nextUrl.pathname === '/dashboard-student' || request.nextUrl.pathname === '/dashboard-teacher' || request.nextUrl.pathname === '/dashboard') {
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
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile-completion', '/verification-pending', '/verification-rejected']
}