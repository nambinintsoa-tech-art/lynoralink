import crypto from "node:crypto";
import { prisma } from "./db.js";

export async function registerSystemRoutes(app) {
  app.get("/v1/status", async (_request, reply) => {
    const checkedAt = new Date().toISOString(); const startedAt = Date.now(); let databaseStatus = "operational";
    try { await prisma.$queryRaw`SELECT 1`; } catch { databaseStatus = "major_outage"; }
    const latencyMs = Date.now() - startedAt; const status = databaseStatus === "operational" ? "operational" : "major_outage";
    await prisma.$executeRaw`INSERT INTO "StatusCheck" ("id", "status", "latencyMs", "checkedAt") VALUES (${crypto.randomUUID()}, ${status}, ${latencyMs}, ${checkedAt})`.catch(() => {});
    const history = await prisma.$queryRaw`SELECT "status", "latencyMs", "checkedAt" FROM "StatusCheck" ORDER BY "checkedAt" DESC LIMIT 30`.catch(() => []);
    return reply.send({ status, checkedAt, latencyMs, services: [{ id: "web", name: "Application LynoraLink", status: "operational" }, { id: "database", name: "Base de données", status: databaseStatus }], history });
  });

  app.get("/v1/stats", async (request, reply) => {
    const [usersCount, companiesCount, postsCount, commentsCount] = await Promise.all([prisma.user.count({ where: { status: "active" } }), prisma.user.count({ where: { status: "active", title: { not: null } } }), prisma.post.count({ where: { status: "published" } }), prisma.comment.count({ where: { post: { status: "published" } } })]);
    return reply.send({ stats: [{ value: usersCount, label: "Professionnels actifs" }, { value: companiesCount, label: "Entreprises présentes" }, { value: postsCount, label: "Publications partagées" }, { value: commentsCount, label: "Échanges engagés" }] });
  });
}
