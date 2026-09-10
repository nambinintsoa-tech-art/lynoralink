import { NextResponse } from "next/server";

export function GET() {
  const key = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ publicKey: null }, { status: 200 });
  return NextResponse.json({ publicKey: key });
}