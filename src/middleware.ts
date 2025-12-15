import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitConfigs, getClientIp, getRateLimitHeaders } from '@/lib/rateLimit';

// Define which paths should have stricter rate limiting
const AUTH_PATHS = ['/api/auth', '/api/login', '/api/signup', '/api/register'];
const SENSITIVE_PATHS = ['/api/users', '/api/payments'];

function getRateLimiter(pathname: string) {
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    return rateLimitConfigs.auth;
  }
  if (SENSITIVE_PATHS.some(path => pathname.startsWith(path))) {
    return rateLimitConfigs.sensitive;
  }
  return rateLimitConfigs.api;
}

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip rate limiting if Redis is not configured (development without Upstash)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Rate limiting disabled: Upstash Redis not configured');
    return NextResponse.next();
  }

  try {
    const ip = getClientIp(request);
    const rateLimiter = getRateLimiter(request.nextUrl.pathname);
    
    const { success, limit, remaining, reset } = await rateLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests', 
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: getRateLimitHeaders({ limit, remaining, reset })
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    const headers = getRateLimitHeaders({ limit, remaining, reset });
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error('Rate limiting error:', error);
    return NextResponse.next();
  }
}

// Configure which routes should be processed by this middleware
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
