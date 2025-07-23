import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to public routes
    if (pathname === "/" || pathname.startsWith("/auth/")) {
      return NextResponse.next()
    }

    // Check if user is authenticated
    if (!token) {
      const loginUrl = new URL("/", req.url)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has court access for protected routes
    if (pathname.startsWith("/officer") && !token.hasCourtAccess) {
      const unauthorizedUrl = new URL("/auth/unauthorized", req.url)
      return NextResponse.redirect(unauthorizedUrl)
    }

    // Check if user has court staff access for court-staff routes
    if (pathname.startsWith("/court-staff") && !token.hasCourtStaffAccess) {
      const unauthorizedUrl = new URL("/auth/unauthorized", req.url)
      return NextResponse.redirect(unauthorizedUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to public routes
        if (pathname === "/" || pathname.startsWith("/auth/")) {
          return true
        }

        // Require authentication for protected routes
        if (pathname.startsWith("/officer")) {
          return !!token && !!token.hasCourtAccess
        }
        
        if (pathname.startsWith("/court-staff")) {
          return !!token && !!token.hasCourtStaffAccess
        }

        // Allow access to other routes if authenticated
        return !!token
      }
    }
  }
)

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
} 