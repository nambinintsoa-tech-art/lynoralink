import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const defaults = { theme: "system", density: "comfortable", fontScale: "medium", language: "fr", timezone: "Africa/Nairobi" };

export async function registerSettingsRoutes(app) {
  app.get("/v1/settings", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const [user, rows] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, image: true, cover: true, bio: true, title: true, location: true, company: true, website: true, birthDate: true, skills: true } }),
      prisma.userSetting.findMany({ where: { userId } }),
    ]);
    if (!user) return reply.code(404).send({ error: "Utilisateur introuvable" });
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const bool = (key, fallback = true) => values[key] === undefined ? fallback : values[key] === "true";
    let skills = [];
    try { skills = user.skills ? JSON.parse(user.skills) : []; } catch {}
    return reply.send({
      profile: { name: user.name || "", headline: user.title || "", birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : "", location: user.location || "", company: user.company || "", website: user.website || "", about: values.profile_about || user.bio || "", bio: user.bio || "", initials: (user.name || user.email || "U").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join(""), avatarSrc: user.image || null, coverSrc: user.cover || null, experience: [], skills: Array.isArray(skills) ? skills : [] },
      privacy: { profileVisibility: values.profileVisibility || "public", showConnections: bool("showConnections"), showActivity: bool("showActivity"), availability: values.availability || "open", searchable: bool("searchable") },
      notifications: { email: { messages: bool("email_messages"), connectionRequests: bool("email_connectionRequests"), endorsements: bool("email_endorsements", false), newsletter: bool("email_newsletter") }, push: { messages: bool("push_messages"), connectionRequests: bool("push_connectionRequests"), mentions: bool("push_mentions"), endorsements: bool("push_endorsements", false) }, showOnlineStatus: bool("showOnlineStatus"), network: {} },
      appearance: { theme: values.theme || defaults.theme, density: values.density || defaults.density, fontScale: values.fontScale || defaults.fontScale },
      account: { email: user.email, language: values.language || defaults.language, timezone: values.timezone || defaults.timezone, twoFactor: bool("twoFactor", false) },
      sessions: [], removedConnections: [],
    });
  });

  app.patch("/v1/settings", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {};
    const profile = body.profile || {};
    const userUpdate = Object.fromEntries([["name", profile.name], ["title", profile.headline], ["location", profile.location], ["company", profile.company], ["website", profile.website], ["bio", profile.bio], ["image", profile.avatarSrc], ["cover", profile.coverSrc]].filter(([, value]) => value !== undefined));
    if (profile.skills !== undefined) userUpdate.skills = JSON.stringify(Array.isArray(profile.skills) ? profile.skills : []);
    if (Object.keys(userUpdate).length) await prisma.user.update({ where: { id: userId }, data: userUpdate });
    const values = [];
    const add = (key, value) => { if (value !== undefined) values.push({ userId, key, value: String(value) }); };
    for (const [key, value] of Object.entries(body.privacy || {})) add(key, value);
    for (const [group, entries] of Object.entries(body.notifications || {})) if (entries && typeof entries === "object") for (const [key, value] of Object.entries(entries)) add(`${group}_${key}`, value);
    for (const [key, value] of Object.entries(body.appearance || {})) add(key, value);
    for (const [key, value] of Object.entries(body.account || {})) if (key !== "email") add(key, value);
    if (profile.about !== undefined) add("profile_about", profile.about);
    await Promise.all(values.map((item) => prisma.userSetting.upsert({ where: { userId_key: { userId, key: item.key } }, update: { value: item.value }, create: item })));
    return reply.send({ ok: true });
  });
}
