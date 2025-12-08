import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/provider-dashboard", "/properties", "/students", "/invoices", "/tickets"];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth cookie/token (Firebase auth state is client-side, 
  // so we'll handle actual auth checks in components)
  // This middleware primarily handles route structure

  // For now, allow all routes - actual auth checking happens client-side
  // In production, you might want to implement server-side session validation

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
