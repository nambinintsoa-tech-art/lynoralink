import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backendUrl = () => (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4001").replace(/\/$/, "");

export async function handler(request, { params }) {
  const path = Array.isArray(params.path) ? params.path.join("/") : "";
  const target = `${backendUrl()}/v1/${path}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type", "cookie", "user-agent", "x-forwarded-for", "x-real-ip"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
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
