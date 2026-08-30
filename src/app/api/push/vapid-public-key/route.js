import { NextResponse } from "next/server";

export function GET() {
  const key = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Web Push non configuré" }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}