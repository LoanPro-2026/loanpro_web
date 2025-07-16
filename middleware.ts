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

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;

  // ======== CORS HANDLING FOR ALL ROUTES ======== //
  const origin = req.headers.get('origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS (preflight) requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }
  // ======== END CORS HANDLING ======== //

  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Only redirect to sign-in if accessing a protected route without authentication
  if (isProtectedRoute && !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Apply CORS headers to all responses
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
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