import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookies
  const hasAuthToken = request.cookies.has('sb-access-token') || 
                       request.cookies.has('sb-refresh-token') ||
                       request.cookies.getAll().some(cookie => cookie.name.includes('supabase'))

  // Protected routes
  const protectedPaths = ['/dashboard', '/offboardings', '/templates', '/tasks']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath && !hasAuthToken) {
    console.log('No auth token, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes - redirect if already logged in
  if ((pathname === '/login' || pathname === '/signup') && hasAuthToken) {
    console.log('Already logged in, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
