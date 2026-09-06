import crypto from "node:crypto";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backendUrl = () => (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4001").replace(/\/$/, "");

async function getAuthenticatedUserId(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return token?.id || token?.sub || null;
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

  try {
    const response = await fetch(target, init);
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "location"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error("Backend proxy error", error);
    return NextResponse.json({ error: "Backend indisponible" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
