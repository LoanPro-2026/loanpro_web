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
];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const pathname = req.nextUrl.pathname;
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true"; // [ELECTRON]

  const isPublicRoute = publicRoutes.some(route =>
    pathname.match(new RegExp(`^${route.replace("*", ".*")}$`))
  );

  // [ELECTRON] Block website-only routes in desktop app
  if (isElectron && ["/sign-in", "/sign-up", "/subscribe"].includes(pathname)) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  // Auth check for private routes
  if (!userId && !isPublicRoute) {
    console.log("auth.userId in middleware:", userId);
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // No subdomain logic needed anymore
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/(.*)",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
