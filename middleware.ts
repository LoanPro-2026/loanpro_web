import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Only protect these specific routes - everything else is public
const protectedRoutes = [
  "/profile",
  "/subscription", 
  "/api/user-profile",
  "/api/create-order",
  "/api/cancel-subscription",
  "/api/upgrade-plan"
];

// Allowed origins for CORS (restrict in production)
const PROD_ALLOWED_ORIGINS = [
  'https://www.loanpro.tech',
  'https://loanpro.tech',
];

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const EXTRA_ALLOWED_ORIGINS = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set([
    ...PROD_ALLOWED_ORIGINS,
    ...(process.env.NODE_ENV === 'production' ? [] : DEV_ALLOWED_ORIGINS),
    ...EXTRA_ALLOWED_ORIGINS,
  ])
);

interface MiddlewareRateLimitEntry {
  count: number;
  resetTime: number;
}

const middlewareApiRateLimitStore = new Map<string, MiddlewareRateLimitEntry>();

function getRequestIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

function getApiLimitProfile(pathname: string): { scope: string; limit: number; windowMs: number } {
  if (pathname.startsWith('/api/webhooks/')) {
    return { scope: 'webhook', limit: 120, windowMs: 60_000 };
  }

  if (
    pathname.startsWith('/api/create-order') ||
    pathname.startsWith('/api/payment-success') ||
    pathname.startsWith('/api/upgrade-plan') ||
    pathname.startsWith('/api/cancel-subscription')
  ) {
    return { scope: 'payment', limit: 35, windowMs: 60_000 };
  }

  if (pathname.startsWith('/api/admin/')) {
    return { scope: 'admin', limit: 50, windowMs: 60_000 };
  }

  return { scope: 'api', limit: 100, windowMs: 60_000 };
}

function checkMiddlewareApiRateLimit(req: Request, pathname: string): { allowed: boolean; retryAfterSeconds: number; remaining: number; limit: number; resetEpochSeconds: number } {
  const ip = getRequestIp(req);
  const profile = getApiLimitProfile(pathname);
  const key = `${profile.scope}:${ip}`;
  const now = Date.now();
  const entry = middlewareApiRateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    middlewareApiRateLimitStore.set(key, { count: 1, resetTime: now + profile.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: profile.limit - 1,
      limit: profile.limit,
      resetEpochSeconds: Math.floor((now + profile.windowMs) / 1000),
    };
  }

  if (entry.count >= profile.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      limit: profile.limit,
      resetEpochSeconds: Math.floor(entry.resetTime / 1000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, profile.limit - entry.count),
    limit: profile.limit,
    resetEpochSeconds: Math.floor(entry.resetTime / 1000),
  };
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === 'null' || origin.startsWith('file://')) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers based on origin
 */
function getCorsHeaders(origin: string | null) {
  const isAllowed = isOriginAllowed(origin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-api-key, x-admin-token',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Security headers to prevent common vulnerabilities
 */
function getSecurityHeaders() {
  return {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection in older browsers
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    
    // Content Security Policy - restrict resource loading
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com https://www.googletagmanager.com https://*.googletagmanager.com https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk.loanpro.tech https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
      "worker-src 'self' blob: https://*.clerk.dev",
      "style-src 'self' 'unsafe-inline' https://*.razorpay.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://api.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk.loanpro.tech https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://lumberjack.razorpay.com wss://*.clerk.accounts.dev https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk.loanpro.tech https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;
  const origin = req.headers.get('origin');
  const isApiRoute = pathname.startsWith('/api/');

  // Get CORS and security headers
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();

  // ======== HANDLE PREFLIGHT REQUESTS ======== //
  if (req.method === 'OPTIONS') {
    const allHeaders = { ...corsHeaders, ...securityHeaders };
    return new NextResponse(null, { 
      status: 204, 
      headers: allHeaders
    });
  }
  // ======== END PREFLIGHT ======== //

  // Global API abuse protection layer (defense in depth).
  if (isApiRoute) {
    const rate = checkMiddlewareApiRateLimit(req, pathname);
    if (!rate.allowed) {
      const allHeaders: Record<string, string> = { ...corsHeaders, ...securityHeaders };
      allHeaders['Retry-After'] = String(rate.retryAfterSeconds);
      allHeaders['X-RateLimit-Limit'] = String(rate.limit);
      allHeaders['X-RateLimit-Remaining'] = String(rate.remaining);
      allHeaders['X-RateLimit-Reset'] = String(rate.resetEpochSeconds);

      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT' },
        { status: 429, headers: allHeaders }
      );
    }
  }

  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // For API routes, return JSON 401 instead of redirecting HTML to avoid client-side flow breaks.
  if (isProtectedRoute && !userId) {
    if (isApiRoute) {
      const allHeaders = { ...corsHeaders, ...securityHeaders };
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: allHeaders }
      );
    }

    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Create response and apply all headers
  const response = NextResponse.next();
  
  // Apply CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

export const config = {
  matcher: [
    // Apply middleware to all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};