import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const backendUrl = () => (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4001").replace(/\/$/, "");

async function getAuthenticatedUserId(request) {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function handler(request, { params }) {
  const path = Array.isArray(params.path) ? params.path.join("/") : "";
  const target = `${backendUrl()}/v1/${path}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type", "cookie", "user-agent", "x-forwarded-for", "x-real-ip"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const userId = await getAuthenticatedUserId(request).catch(() => null);
  if (userId && process.env.NEXTAUTH_SECRET) {
    const signature = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET).update(userId).digest("hex");
    headers.set("x-lynora-user-id", userId);
    headers.set("x-lynora-user-signature", signature);
  }

  const init = { method: request.method, headers, redirect: "manual", cache: "no-store" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();

  // Set appropriate timeout based on route type
  // AI generation endpoints need longer timeouts
  let timeoutMs = 10000; // 10 seconds default
  if (path.includes("ai-image") || path.includes("ai-article")) {
    timeoutMs = 120000; // 120 seconds for AI generation
  } else if (path.includes("notifications")) {
    timeoutMs = 5000; // 5 seconds for notifications
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(target, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "location"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error(`Backend proxy error for ${path}:`, error);
    if (error?.name === "AbortError") {
      return NextResponse.json({ error: "Requête backend expirée (timeout)" }, { status: 504 });
    }
    return NextResponse.json({ error: "Backend indisponible" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
