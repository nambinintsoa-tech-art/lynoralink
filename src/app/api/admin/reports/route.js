import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { reporter: { select: { name: true, email: true } } },
  });

  const shaped = reports.map((r) => ({
    id: r.id,
    type: r.type,
    targetId: r.targetId,
    targetLabel: r.targetLabel,
    reporter: r.reporter?.name || "Utilisateur",
    reporterId: r.reporterId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ reports: shaped });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, targetId, targetLabel, reason, details } = body || {};

    if (!type || !targetId || !reason) {
      return NextResponse.json({ error: "type, targetId et reason requis" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        type,
        targetId,
        targetLabel: targetLabel || `Cible ${targetId}`,
        reporterId: session.user.id,
        reason,
        details: details || null,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("Erreur création report:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, resolution } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data = {};
    if (status !== undefined) data.status = status;
    if (resolution !== undefined) data.resolution = resolution;
    if (status === "reviewed" || status === "dismissed") {
      data.resolvedAt = new Date();
    }

    const report = await prisma.report.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
