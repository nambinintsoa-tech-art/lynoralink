import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

export async function registerProfileRoutes(app) {
  app.get("/v1/profile/activity", async (request, reply) => {
    const sessionUserId = await getSessionUserId(request);
    const requestedUserId = request.query?.userId;
    const userId = requestedUserId || sessionUserId;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setFullYear(startDate.getFullYear() - 1);
    const activitySetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "showActivity" } }, select: { value: true } });
    if (userId !== sessionUserId && activitySetting?.value === "false") return reply.send({ activity: [] });
    const posts = await prisma.post.findMany({ where: { authorId: userId, status: "published", createdAt: { gte: startDate } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } });
    const activity = posts.reduce((result, post) => { const day = post.createdAt.toISOString().slice(0, 10); result[day] = (result[day] || 0) + 1; return result; }, {});
    return reply.send({ activity: Object.entries(activity).map(([day, count]) => ({ day, count })) });
  });

  app.get("/v1/profile", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifie" });
    const targetUserId = String(request.query?.userId || userId);
    const [user, settings] = await Promise.all([prisma.user.findUnique({ where: { id: targetUserId } }), prisma.userSetting.findMany({ where: { userId: targetUserId } })]);
    if (!user) return reply.send({ user: null });
    let skills = []; try { skills = user.skills ? JSON.parse(user.skills) : []; } catch {}
    let experience = []; try { experience = JSON.parse(settings.find((row) => row.key === "profile_experience")?.value || "[]"); } catch {}
    const subscription = await prisma.subscription.findUnique({ where: { userId: targetUserId }, select: { status: true, currentPeriodEnd: true } });
    const isPremium = Boolean(subscription && ["ACTIVE", "TRIALING"].includes(subscription.status) && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date()));
    return reply.send({ user: { id: user.id, name: user.name, email: user.email, image: user.image || null, avatarUrl: user.image || null, photoUrl: user.image || null, cover: user.cover || null, title: user.title || null, bio: user.bio || null, birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : null, about: settings.find((row) => row.key === "profile_about")?.value || user.bio || null, location: user.location || null, website: user.website || null, company: user.company || null, sector: user.sector || null, skills: Array.isArray(skills) ? skills : [], experience: Array.isArray(experience) ? experience : [], status: settings.find((row) => row.key === "availability")?.value || "open", plan: user.plan || null, isPremium, isPlatformAdmin: user.role === "admin" } });
  });

  app.patch("/v1/profile", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {};
    const data = {};
    for (const key of ["title", "bio", "location", "company", "sector", "image", "cover"]) if (body[key] !== undefined) data[key] = body[key];
    if (body.birthDate !== undefined) data.birthDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.birthDate)) ? new Date(`${body.birthDate}T12:00:00Z`) : null;
    if (body.skills !== undefined) data.skills = JSON.stringify(Array.isArray(body.skills) ? body.skills : []);
    const user = await prisma.user.update({ where: { id: userId }, data });
    let skills = []; try { skills = user.skills ? JSON.parse(user.skills) : []; } catch {}
    return reply.send({ user: { id: user.id, title: user.title, bio: user.bio, birthDate: user.birthDate?.toISOString().slice(0, 10) || null, location: user.location, company: user.company, sector: user.sector, skills, image: user.image || null, avatarUrl: user.image || null, photoUrl: user.image || null } });
  });
}