import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/api/payment-success",
  "/pricing",
  "/features",
  "/get-started",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/subscribe",
  "/api/devices/(.*)" // NEW: Allow all device API endpoints
];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";

  // ======== NEW: CORS HANDLING ======== //
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

  // [Existing Electron logic...]
  if (isElectron && ["/sign-in", "/sign-up", "/subscribe"].includes(pathname)) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  const isPublicRoute = publicRoutes.some(route =>
    pathname.match(new RegExp(`^${route.replace("*", ".*")}$`))
  );

  if (!userId && !isPublicRoute) {
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
    "/api/create-order",
    "/api/payment-success",
    "/api/devices/bind",
    "/api/devices/request-switch",
    "/api/devices/revoke",
    "/api/devices/cors",
    "/api/user-profile",
    "/api/cancel-subscription",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};