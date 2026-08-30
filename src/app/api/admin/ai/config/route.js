import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, email: true } });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const isAdmin = user?.role === "admin" || (adminEmail && user.email?.toLowerCase() === adminEmail);
  if (!isAdmin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const provider = String(process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "auto").toLowerCase();
  const configured = provider === "cloudflare"
    ? Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID)
    : Boolean(process.env.GROQ_API_KEY || (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID));
  return NextResponse.json({
    provider,
    model: process.env.GROQ_MODEL || process.env.CLOUDFLARE_MODEL || "modèle par défaut",
    configured,
    announcementEndpoint: "/api/admin/ai/announcement",
    supportEndpoint: "/api/admin/ai/support",
  });
}
