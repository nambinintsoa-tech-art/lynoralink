import nextAuthMiddleware from "next-auth/middleware";
import { NextResponse } from "next/server";

export default function middleware(req) {
  if (req.nextUrl?.pathname === "/&") {
    return new NextResponse(null, {
      status: 204,
      headers: { "Content-Type": "text/css", "Cache-Control": "no-store" },
    });
  }

  try {
    const url = req.nextUrl?.pathname || req.url || "<unknown>";
    if (process.env.NODE_ENV !== "production") console.log(`[middleware] incoming request: ${url}`);
  } catch (e) {
    // ignore logging errors
  }
  return nextAuthMiddleware(req);
}

export const config = {
  matcher: ["/&", "/feed/:path*", "/onboarding/:path*", "/settings/:path*"],
};
