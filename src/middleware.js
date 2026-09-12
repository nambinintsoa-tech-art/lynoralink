import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
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

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/&", "/feed/:path*", "/onboarding/:path*", "/settings/:path*"],
};
