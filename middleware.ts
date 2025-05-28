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
  const host = req.headers.get("host") || "";
  const cleanHost = host.split(":")[0];
  const parts = cleanHost.split(".");

  const isLocalhost =
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost.endsWith(".localhost");

  const subdomain =
    !isLocalhost && parts.length > 2 ? parts[0] : null;

  const response = NextResponse.next();

  // Mark /app/app/* routes with custom header
  if (pathname.startsWith("/app/app")) {
    response.headers.set("x-app-route", "true");
  }

  // Handle /app/* route access
  if (pathname.startsWith("/app/")) {
    if ((!subdomain || subdomain === "www" || subdomain === "loanpro") && !isLocalhost) {
      console.log("Blocked /app/* access due to missing subdomain");
      const url = req.nextUrl.clone();
      url.hostname = cleanHost.replace(/^.*?\./, "");
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Add tenant header if subdomain exists
    if (subdomain) {
      response.headers.set("x-tenant", subdomain);
    }
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
