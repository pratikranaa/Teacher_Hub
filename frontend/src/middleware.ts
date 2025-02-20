import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userData = request.cookies.get('userData')?.value
  
  if (!userData) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = JSON.parse(userData)

  // Handle different routes based on user status
  if (request.nextUrl.pathname === '/dashboard') {
    if (!user.profileCompleted) {
      return NextResponse.redirect(new URL('/profile-completion', request.url))
    }
    if (user.verificationStatus === 'PENDING') {
      return NextResponse.redirect(new URL('/verification-pending', request.url))
    }
    if (user.verificationStatus === 'REJECTED') {
      return NextResponse.redirect(new URL('/verification-rejected', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile-completion', '/verification-pending', '/verification-rejected']
}