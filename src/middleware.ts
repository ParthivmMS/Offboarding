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

  // Check for ANY Supabase auth cookie (they have random prefixes)
  const allCookies = request.cookies.getAll()
  const hasAuthToken = allCookies.some(cookie => 
    cookie.name.includes('auth-token') || 
    cookie.name.includes('sb-') ||
    cookie.name === 'supabase-auth-token'
  )

  console.log('Middleware check:', { pathname, hasAuthToken, cookies: allCookies.map(c => c.name) })

  // Protected routes
  const protectedPaths = ['/dashboard', '/offboardings', '/templates', '/tasks']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath && !hasAuthToken) {
    console.log('No auth, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes - redirect if already logged in
  if ((pathname === '/login' || pathname === '/signup') && hasAuthToken) {
    console.log('Already authenticated, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
