import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

async function authenticated(request, reply) {
  const userId = await getSessionUserId(request);
  if (!userId) { reply.code(401).send({ error: "Non authentifie" }); return null; }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) { reply.code(401).send({ error: "Session invalide" }); return null; }
  return userId;
}

export async function registerAccountSwitchRoutes(app) {
  app.get("/v1/account/switch", async (request, reply) => {
    const userId = await authenticated(request, reply); if (!userId) return;
    const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "activeAccount" } } });
    return reply.send({ account: setting?.value === "company" ? "company" : "personal" });
  });
  app.post("/v1/account/switch", async (request, reply) => {
    const userId = await authenticated(request, reply); if (!userId) return;
    const account = request.body?.account === "company" ? "company" : "personal";
    if (account === "company" && !await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "companyPage" } } })) return reply.code(404).send({ error: "Page entreprise introuvable" });
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: "activeAccount" } }, create: { userId, key: "activeAccount", value: account }, update: { value: account } });
    return reply.send({ account });
  });
}