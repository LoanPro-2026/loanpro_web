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
const ALLOWED_ORIGINS = [
  'https://www.loanpro.tech',
  'https://loanpro.tech',
];

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
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-api-key, x-admin-token',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com https://checkout.razorpay.com https://*.razorpay.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk.loanpro.tech https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
      "worker-src 'self' blob: https://*.clerk.dev",
      "style-src 'self' 'unsafe-inline' https://*.razorpay.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://api.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk.loanpro.tech https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://lumberjack.razorpay.com wss://*.clerk.accounts.dev https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/",
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