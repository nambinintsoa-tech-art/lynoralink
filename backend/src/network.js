import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const listKey = "network_lists";
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";

async function lists(userId) {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: listKey } }, select: { value: true } });
  try { const parsed = JSON.parse(row?.value || "[]"); return (Array.isArray(parsed) ? parsed : parsed?.lists || []).filter(Boolean); } catch { return []; }
}
async function saveLists(userId, value) { await prisma.userSetting.upsert({ where: { userId_key: { userId, key: listKey } }, update: { value: JSON.stringify(value) }, create: { userId, key: listKey, value: JSON.stringify(value) } }); }

export async function registerNetworkRoutes(app) {
  app.delete("/v1/removed-connections", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const targetId = request.query?.userId;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!targetId) return reply.code(400).send({ error: "Utilisateur invalide." });

    const connection = await prisma.$transaction(async (tx) => {
      await tx.removedConnection.deleteMany({ where: { userId, targetId } });
      const existing = await tx.connection.findFirst({ where: { OR: [{ userAId: userId, userBId: targetId }, { userAId: targetId, userBId: userId }] } });
      if (existing) return tx.connection.update({ where: { id: existing.id }, data: { status: "accepted" } });
      return tx.connection.create({ data: { userAId: userId, userBId: targetId, status: "accepted" } });
    });
    return reply.send({ ok: true, restored: true, connection });
  });

  app.get("/v1/network-lists", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    return reply.send({ lists: await lists(userId) });
  });
  app.post("/v1/network-lists", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {}; const name = String(body.name || "").trim();
    if (!name) return reply.code(400).send({ error: "Le nom de la liste est obligatoire." });
    const current = await lists(userId); const item = { id: body.id || `list-${Date.now()}`, name, description: String(body.description || ""), color: String(body.color || "#D4A72C"), memberIds: [...new Set((Array.isArray(body.memberIds) ? body.memberIds : []).map(String))], createdAt: new Date().toISOString() };
    const next = [item, ...current.filter((entry) => entry.id !== item.id)]; await saveLists(userId, next); return reply.send({ ok: true, list: item, lists: next });
  });
  app.patch("/v1/network-lists", async (request, reply) => {
    const userId = await getSessionUserId(request); const body = request.body || {}; const id = body.id || body.listId;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const current = await lists(userId); const index = current.findIndex((entry) => entry.id === id); if (index < 0) return reply.code(404).send({ error: "Liste introuvable." });
    const item = { ...current[index], ...body, id, memberIds: Array.isArray(body.memberIds) ? [...new Set(body.memberIds.map(String))] : current[index].memberIds }; const next = [...current]; next[index] = item; await saveLists(userId, next); return reply.send({ ok: true, list: item, lists: next });
  });
  app.delete("/v1/network-lists", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const id = request.query?.id || request.query?.listId; const next = (await lists(userId)).filter((entry) => entry.id !== id); await saveLists(userId, next); return reply.send({ ok: true, lists: next });
  });

  app.get("/v1/connections", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const rows = await prisma.connection.findMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] }, include: { userA: { select: { id: true, name: true, title: true, image: true } }, userB: { select: { id: true, name: true, title: true, image: true } } }, orderBy: { createdAt: "desc" } });
    const format = (row, other) => ({ id: other.id, connectionId: row.id, userId: other.id, name: other.name || "Utilisateur", title: other.title || "Membre LynoraLink", initials: initials(other.name || "Utilisateur"), image: other.image || null });
    return reply.send({ connections: rows.filter((row) => row.status === "accepted").map((row) => format(row, row.userAId === userId ? row.userB : row.userA)), invitations: rows.filter((row) => row.status === "pending" && row.userBId === userId).map((row) => format(row, row.userA)), pendingRequests: rows.filter((row) => row.status === "pending" && row.userAId === userId).map((row) => format(row, row.userB)), totalConnections: rows.filter((row) => row.status === "accepted").length });
  });
  app.post("/v1/connections", async (request, reply) => {
    const userId = await getSessionUserId(request); const { targetUserId, action = "invite" } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" }); if (!targetUserId || targetUserId === userId) return reply.code(400).send({ error: "Utilisateur invalide." });
    const existing = await prisma.connection.findFirst({ where: { OR: [{ userAId: userId, userBId: targetUserId }, { userAId: targetUserId, userBId: userId }] } });
    if (action === "remove" || action === "decline") { if (existing) await prisma.connection.delete({ where: { id: existing.id } }); return reply.send({ ok: true, deleted: true, removed: action === "remove" }); }
    if (action === "accept" && existing) { const updated = await prisma.connection.update({ where: { id: existing.id }, data: { status: "accepted" } }); return reply.send({ ok: true, accepted: true, connection: updated }); }
    if (existing) return reply.send({ ok: true, connection: existing, pending: existing.status === "pending" });
    const created = await prisma.connection.create({ data: { userAId: userId, userBId: targetUserId, status: "pending" } }); return reply.send({ ok: true, connection: created, pending: true });
  });
}
