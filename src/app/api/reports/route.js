import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_REASONS = new Set(["fake", "spam", "impersonation", "harassment", "scam"]);

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const reporterId = session?.user?.id;
  if (!reporterId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
  const targetLabel = typeof body?.targetLabel === "string" ? body.targetLabel.trim() : "Profil utilisateur";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!targetId || !ALLOWED_REASONS.has(reason)) {
    return NextResponse.json({ error: "Signalement invalide" }, { status: 400 });
  }
  if (targetId === reporterId) {
    return NextResponse.json({ error: "Vous ne pouvez pas signaler votre propre profil" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const report = await prisma.report.create({
    data: {
      type: "profile",
      targetId,
      targetLabel: targetLabel || "Profil utilisateur",
      reporterId,
      reason,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ report }, { status: 201 });
}
