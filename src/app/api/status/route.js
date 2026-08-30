import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  let databaseStatus = "operational";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseStatus = "major_outage";
    console.error("[status] database health check failed", error);
  }

  const latencyMs = Date.now() - startedAt;
  const overallStatus = databaseStatus === "operational" ? "operational" : "major_outage";
  await prisma.$executeRaw`INSERT INTO "StatusCheck" ("id", "status", "latencyMs", "checkedAt") VALUES (${crypto.randomUUID()}, ${overallStatus}, ${latencyMs}, ${checkedAt})`.catch((error) => {
    console.error("[status] unable to save health check", error);
  });
  const history = await prisma.$queryRaw`SELECT "status", "latencyMs", "checkedAt" FROM "StatusCheck" ORDER BY "checkedAt" DESC LIMIT 30`.catch(() => []);

  return NextResponse.json({
    status: overallStatus,
    checkedAt,
    latencyMs,
    services: [
      { id: "web", name: "Application LynoraLink", description: "Connexion, fil d'actualité et navigation", status: "operational" },
      { id: "assistant", name: "Assistant IA", description: "Réponses et actions dans votre espace", status: "operational" },
      { id: "database", name: "Base de données", description: "Comptes, publications et demandes de support", status: databaseStatus },
    ],
    history,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}