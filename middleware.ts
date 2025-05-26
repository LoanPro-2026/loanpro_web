import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/api/create-order",
  "/api/payment-success",
  "/pricing",
  "/features",
  "/get-started",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/subscribe",
];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const pathname = req.nextUrl.pathname;

  const isPublicRoute = publicRoutes.some(route =>
    pathname.match(new RegExp(`^${route.replace("*", ".*")}$`))
  );

  // Auth check for private routes
  if (!userId && !isPublicRoute) {
    console.log("auth.userId in middleware:", userId);
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Extract host and subdomain
  const host = req.headers.get('host') || '';
  const cleanHost = host.split(':')[0]; // remove port if present
  const parts = cleanHost.split('.');

  // Detect localhost or 127.0.0.1 for dev environment
  const isLocalhost = cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost.endsWith('.localhost');

  // Define subdomain (only if NOT localhost and parts length > 2)
  const subdomain = (!isLocalhost && parts.length > 2) ? parts[0] : null;

  // Handle /app/* route access
  if (pathname.startsWith('/app/')) {
    // In production, require subdomain. In dev (localhost), allow access without subdomain.
    if ((!subdomain || subdomain === 'www' || subdomain === 'loanpro') && !isLocalhost) {
      console.log("Blocked /app/* access due to missing subdomain");
      const url = req.nextUrl.clone();
      url.hostname = cleanHost.replace(/^.*?\./, ''); // remove subdomain if any
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Add tenant header if subdomain exists
    const response = NextResponse.next();
    if (subdomain) {
      response.headers.set('x-tenant', subdomain);
    }
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
