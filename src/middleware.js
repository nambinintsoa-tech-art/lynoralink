import nextAuthMiddleware from "next-auth/middleware";

export default function middleware(req) {
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
  matcher: ["/feed/:path*", "/onboarding/:path*", "/settings/:path*"],
};
