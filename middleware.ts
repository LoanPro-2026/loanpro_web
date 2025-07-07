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
  "/api/devices/bind",       // Explicitly allow device API
  "/api/devices/revoke",     // Allow device revocation
  "/api/devices/request-switch" // Allow switch requests
];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";

  // [FIX] Allow OPTIONS requests (CORS preflight)
  if (req.method === "OPTIONS") {
    return NextResponse.json({}, { status: 204 });
  }

  // [ELECTRON] Block website-only routes in desktop app
  if (isElectron && ["/sign-in", "/sign-up", "/subscribe"].includes(pathname)) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  const isPublicRoute = publicRoutes.some(route =>
    pathname.match(new RegExp(`^${route.replace("*", ".*")}$`))
  );

  // Auth check for private routes
  if (!userId && !isPublicRoute) {
    console.log("auth.userId in middleware:", userId);
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/(.*)",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};