import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
const parse = (value, fallback = {}) => { try { return JSON.parse(value || "null") || fallback; } catch { return fallback; } };

export async function registerDirectoryRoutes(app) {
  app.get("/v1/users", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const search = String(request.query?.search || "").trim().toLowerCase(); const limit = Math.min(Number(request.query?.limit) || 50, 100);
    const users = await prisma.user.findMany({ where: { id: { not: userId }, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) }, select: { id: true, name: true, title: true, image: true, cover: true }, orderBy: { createdAt: "desc" }, take: limit });
    return reply.send({ users: users.map((user) => ({ ...user, name: user.name || "Utilisateur", initials: initials(user.name || "Utilisateur") })), suggestions: [] });
  });

  app.get("/v1/company/pages", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const followed = parse((await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "followedCompanyPages" } } }))?.value, []);
    const settings = await prisma.userSetting.findMany({ where: { key: "companyPage", userId: { not: userId } }, orderBy: { updatedAt: "desc" } });
    return reply.send({ pages: settings.map((setting) => { const page = parse(setting.value); const name = String(page.name || page.displayName || "Mon entreprise"); return { ...page, id: setting.userId, name, displayName: name, followed: followed.includes(setting.userId), subscribers: [], stats: { ...(page.stats || {}), followers: 0 } }; }) });
  });

  app.get("/v1/company/follow", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" }); const pages = parse((await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "followedCompanyPages" } } }))?.value, []); const pageId = request.query?.pageId; return reply.send(pageId ? { followed: pages.includes(pageId) } : { followedPages: pages });
  });
  app.post("/v1/company/follow", async (request, reply) => {
    const userId = await getSessionUserId(request); const pageId = request.body?.pageId; if (!userId) return reply.code(401).send({ error: "Non authentifié" }); if (!pageId) return reply.code(400).send({ error: "Page invalide" }); if (!await prisma.userSetting.findUnique({ where: { userId_key: { userId: pageId, key: "companyPage" } } })) return reply.code(404).send({ error: "Page introuvable" }); const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "followedCompanyPages" } } }); const current = parse(row?.value, []); const followed = !current.includes(pageId); const next = followed ? [...current, pageId] : current.filter((id) => id !== pageId); await prisma.userSetting.upsert({ where: { userId_key: { userId, key: "followedCompanyPages" } }, update: { value: JSON.stringify(next) }, create: { userId, key: "followedCompanyPages", value: JSON.stringify(next) } }); return reply.send({ followed });
  });
}
