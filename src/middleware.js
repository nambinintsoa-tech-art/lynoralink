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
    const referer = req.headers.get?.("referer") || req.headers.get?.("referrer") || "";
    console.log(`[middleware] incoming request: ${url}  referer: ${referer}`);
  } catch (e) {
    // ignore logging errors
  }
  return nextAuthMiddleware(req);
}

export const config = {
  matcher: ["/&", "/feed/:path*", "/onboarding/:path*", "/settings/:path*"],
};
