import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.platformSetting.findMany({ where: { key: { in: ["supportFaq", "supportCgu"] } } });
  return NextResponse.json({ content: Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
