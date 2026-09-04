import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const DEFAULT_COVER = "linear-gradient(160deg, #1F6F4C 0%, #122318 100%)";
const DEFAULT_QUESTIONS = [
  { id: "rules", label: "Acceptez-vous de respecter les règles du groupe ?" },
  { id: "participation", label: "Souhaitez-vous participer régulièrement aux échanges ?" },
  { id: "relevance", label: "Votre intérêt correspond-il au thème de ce groupe ?" },
];

function array(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function json(value) { return JSON.stringify(Array.isArray(value) ? value : []); }
function member(group, userId) { return array(group.members).find((item) => item?.id === userId); }
function isMember(group, userId) { return group.ownerId === userId || Boolean(member(group, userId)); }
function isAdmin(group, userId) { return group.ownerId === userId || ["admin", "moderator"].includes(member(group, userId)?.role); }
function initials(name = "") { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U"; }
function safeFileName(name = "fichier") { return String(name).replace(/[\\"\r\n]/g, "_").trim() || "fichier"; }
function safeFileUrl(value) {
  try {
    const url = new URL(String(value));
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return null;
    return url.toString();
  } catch { return null; }
}
function safeContentType(value) {
  const contentType = String(value || "application/octet-stream").split(";", 1)[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(contentType) ? contentType : "application/octet-stream";
}
const MAX_GROUP_FILE_BYTES = 25 * 1024 * 1024;
function adminIds(group) { return [...new Set([group.ownerId, ...array(group.members).filter((item) => ["admin", "moderator"].includes(item?.role)).map((item) => item?.id)].filter(Boolean))]; }
async function notify(userId, senderId, type, actor, text, meta) {
  await prisma.notification.create({ data: { userId, senderId, type, actor, initials: initials(actor), text, message: text, meta: JSON.stringify(meta) } });
}

function parseGroup(group, userId, includePrivate = false) {
  const owned = isMember(group, userId);
  const posts = array(group.posts).filter((post) => post?.status !== "pending_review" || owned || post?.authorId === userId);
  return {
    id: group.id, ownerId: group.ownerId, name: group.name, emoji: group.emoji || "🌐", description: group.description || "", category: group.category || "tech",
    coverGradient: group.coverGradient || DEFAULT_COVER, coverUrl: group.coverUrl || null, avatarUrl: group.avatarUrl || null, privacy: group.privacy || "public", postPermission: group.postPermission || "all", location: group.location || null, inviteLink: group.inviteLink || null,
    members: owned || includePrivate ? array(group.members) : [], joinRequests: isAdmin(group, userId) ? array(group.joinRequests) : [], joinQuestions: isAdmin(group, userId) ? array(group.joinQuestions) : [], posts,
    events: owned ? array(group.events) : [], media: owned ? array(group.media) : [], files: owned ? array(group.files) : [], announcements: owned ? array(group.announcements) : [], rules: array(group.rules), tags: array(group.tags),
    createdAt: group.createdAt?.toISOString?.() || null, updatedAt: group.updatedAt?.toISOString?.() || null, memberCount: array(group.members).length, postsCount: posts.length, pendingRequests: isAdmin(group, userId) ? array(group.joinRequests).length : 0, canShare: owned,
  };
}

async function findGroup(id, reply) {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) { reply.code(404).send({ error: "Groupe introuvable" }); return null; }
  return group;
}

export async function registerGroupRoutes(app) {
  app.get("/v1/groups", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const search = String(request.query?.search || "").trim().toLowerCase();
    const groups = await prisma.group.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ groups: groups.filter((group) => !search || [group.name, group.description, group.category, group.privacy].join(" ").toLowerCase().includes(search)).map((group) => parseGroup(group, userId)) });
  });

  app.post("/v1/groups", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {}; const name = String(body.name || "").trim();
    if (!name || name.length > 60) return reply.code(400).send({ error: "Le nom du groupe est requis et doit contenir au plus 60 caractères" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } }); const personName = user?.name || "Vous";
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "groupe";
    const owner = { id: userId, name: personName, initials: initials(personName), image: user?.image || null, avatarUrl: user?.image || null, photoUrl: user?.image || null, online: true, role: "admin", title: "Vous", joinedAt: new Date().toISOString(), postsCount: 0 };
    const group = await prisma.group.create({ data: {
      ownerId: userId, name, emoji: String(body.emoji || "🌐").slice(0, 8), description: String(body.description || "").slice(0, 1000), category: String(body.category || "tech").slice(0, 80), coverGradient: String(body.coverGradient || DEFAULT_COVER).slice(0, 500), coverUrl: body.coverUrl ? String(body.coverUrl).slice(0, 2000) : null, avatarUrl: body.avatarUrl ? String(body.avatarUrl).slice(0, 2000) : null, privacy: ["public", "private"].includes(body.privacy) ? body.privacy : "public", postPermission: ["all", "admins"].includes(body.postPermission) ? body.postPermission : "all", location: body.location ? String(body.location).slice(0, 200) : null, inviteLink: body.inviteLink ? String(body.inviteLink).slice(0, 2000) : `https://lynora.app/g/${slug}`, members: json([owner]), joinRequests: json([]), joinQuestions: json(Array.isArray(body.joinQuestions) ? body.joinQuestions : DEFAULT_QUESTIONS), posts: json([]), events: json([]), media: json([]), files: json([]), announcements: json([]), rules: json(Array.isArray(body.rules) ? body.rules.map(String).slice(0, 50) : ["Soyez respectueux"]), tags: json(Array.isArray(body.tags) ? body.tags.map(String).slice(0, 30) : []),
    } });
    return reply.code(201).send({ ok: true, group: parseGroup(group, userId, true) });
  });

  app.get("/v1/groups/:id", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); return group ? reply.send({ group: parseGroup(group, userId) }) : undefined;
  });

  app.patch("/v1/groups/:id", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (!isMember(group, userId)) return reply.code(403).send({ error: "Vous devez être membre de ce groupe" });
    const body = request.body || {}; const admin = isAdmin(group, userId); const data = {};
    if (admin) for (const key of ["name", "description", "category", "coverGradient", "coverUrl", "avatarUrl", "privacy", "postPermission", "location", "inviteLink", "emoji"]) if (typeof body[key] === "string") data[key] = body[key].trim();
    for (const key of ["posts", "events", "media", "files"]) if (Array.isArray(body[key])) data[key] = json(body[key]);
    for (const key of ["members", "joinRequests", "announcements", "rules", "tags", "joinQuestions"]) if (admin && Array.isArray(body[key])) data[key] = json(body[key]);
    if (admin && data.name === "") return reply.code(400).send({ error: "Le nom du groupe est requis" });
    const updated = await prisma.group.update({ where: { id: group.id }, data }); return reply.send({ ok: true, group: parseGroup(updated, userId, true) });
  });

  app.delete("/v1/groups/:id", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (group.ownerId !== userId) return reply.code(403).send({ error: "Seul le propriétaire peut supprimer ce groupe" });
    await prisma.group.delete({ where: { id: group.id } }); return reply.send({ ok: true, deletedId: group.id });
  });

  app.post("/v1/groups/:id/join", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
      const group = await findGroup(request.params.id, reply); if (!group) return reply.code(404).send({ error: "Groupe introuvable" });
    if (group.privacy !== "public") return reply.code(403).send({ error: "Ce groupe n'est pas ouvert aux adhésions directes" });
    if (isMember(group, userId)) return reply.send({ ok: true, alreadyMember: true });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } }); const name = user?.name || "Vous";
    const newMember = { id: userId, name, initials: initials(name), image: user?.image || null, avatarUrl: user?.image || null, photoUrl: user?.image || null, online: true, role: "member", title: "Vous", joinedAt: new Date().toISOString(), postsCount: 0 };
    await prisma.group.update({ where: { id: group.id }, data: { members: json([...array(group.members), newMember]) } }); return reply.send({ ok: true, member: newMember });
  });

  app.post("/v1/groups/:id/leave", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (group.ownerId === userId) return reply.code(403).send({ error: "Le propriétaire ne peut pas quitter son groupe" });
    const members = array(group.members);
    if (!members.some((member) => String(member?.id) === String(userId))) return reply.send({ ok: true, alreadyLeft: true });
    await prisma.group.update({ where: { id: group.id }, data: { members: json(members.filter((member) => String(member?.id) !== String(userId))) } });
    return reply.send({ ok: true, left: true });
  });

  app.post("/v1/groups/:id/join-requests", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (group.privacy !== "private") return reply.code(400).send({ error: "Ce groupe accepte les adhésions directes" });
    if (isMember(group, userId)) return reply.code(409).send({ error: "Vous êtes déjà membre de ce groupe" });
    const requests = array(group.joinRequests); if (requests.some((item) => item?.userId === userId && (item.status || "pending") === "pending")) return reply.code(409).send({ error: "Votre demande est déjà en attente" });
    const configured = array(group.joinQuestions).filter((item) => item?.id && item?.label); const questions = configured.length ? configured : DEFAULT_QUESTIONS; const answers = request.body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || questions.some((question) => typeof answers[question.id] !== "boolean") || Object.keys(answers).length !== questions.length) return reply.code(400).send({ error: "Répondez à toutes les questions par oui ou non" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true, title: true } }); const name = user?.name || "Utilisateur";
    const item = { id: `join_${Date.now()}_${userId}`, userId, name, initials: initials(name), title: user?.title || "Membre LynoraLink", image: user?.image || null, avatarUrl: user?.image || null, answers: Object.fromEntries(questions.map((question) => [question.id, answers[question.id]])), requestedAt: new Date().toISOString(), status: "pending" };
    const updated = await prisma.group.update({ where: { id: group.id }, data: { joinRequests: json([item, ...requests.filter((entry) => entry?.userId !== userId)]) } });
    await Promise.all(adminIds(group).filter((id) => id !== userId).map((id) => notify(id, userId, "group_join_request", name, `${name} souhaite rejoindre le groupe ${group.name}.`, { groupId: group.id, kind: "group_join_request", groupName: group.name })));
    return reply.code(201).send({ ok: true, request: item, joinRequests: array(updated.joinRequests) });
  });

  app.patch("/v1/groups/:id/join-requests", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (!isAdmin(group, userId)) return reply.code(403).send({ error: "Accès interdit" });
    const { requestId, decision } = request.body || {}; if (!requestId || !["approved", "rejected"].includes(decision)) return reply.code(400).send({ error: "Décision invalide" });
    const requests = array(group.joinRequests); const pending = requests.find((item) => item?.id === requestId); if (!pending) return reply.code(404).send({ error: "Demande introuvable" });
    const nextMembers = array(group.members); if (decision === "approved" && !isMember(group, pending.userId)) nextMembers.push({ id: pending.userId, name: pending.name, initials: pending.initials, image: pending.image || pending.avatarUrl || null, avatarUrl: pending.avatarUrl || pending.image || null, online: false, role: "member", title: pending.title || "Membre", joinedAt: new Date().toISOString(), postsCount: 0 });
    const updated = await prisma.group.update({ where: { id: group.id }, data: { members: json(nextMembers), joinRequests: json(requests.filter((item) => item?.id !== requestId)) } });
    const decisionText = decision === "approved" ? `Votre demande pour rejoindre ${group.name} a été approuvée.` : `Votre demande pour rejoindre ${group.name} a été refusée.`;
    await notify(pending.userId, userId, decision === "approved" ? "group_join_approved" : "group_join_rejected", group.name, decisionText, { groupId: group.id, kind: decision === "approved" ? "group_join_approved" : "group_join_rejected" });
    return reply.send({ ok: true, decision, group: parseGroup(updated, userId, true) });
  });

  app.post("/v1/groups/:id/events", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    const creator = member(group, userId);
    if (!isMember(group, userId)) return reply.code(403).send({ error: "Vous devez être membre de ce groupe" });
    const body = request.body || {}; const title = String(body.title || "").trim(); const location = String(body.location || "").trim(); const date = String(body.date || "").trim();
    if (title.length < 3 || !location || !date) return reply.code(400).send({ error: "Le titre, le lieu ou lien et la date sont requis" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } });
    const event = { id: `ev_${Date.now()}_${userId.slice(-6)}`, title, description: String(body.description || "").trim(), type: body.type === "online" ? "online" : "in-person", location, date, time: String(body.time || "À définir"), duration: String(body.duration || "1h"), attendees: 0, maxAttendees: Math.max(1, Number(body.maxAttendees) || 50), createdBy: userId, createdByName: user?.name || creator?.name || "Utilisateur", createdByAvatar: user?.image || creator?.image || creator?.avatarUrl || null, createdAt: new Date().toISOString() };
    const events = array(group.events); const posts = array(group.posts);
    const eventPost = { id: `event_post_${event.id}`, type: "event", isEvent: true, event, authorId: userId, author: event.createdByName, initials: creator?.initials || initials(event.createdByName), avatarUrl: event.createdByAvatar, authorTitle: "Membre", title: "Membre", role: "Membre", createdAt: event.createdAt, time: event.createdAt, text: "", media: [], images: [], visibility: group.privacy === "private" ? "Privé" : "Public", reactions: {}, comments: [], shares: 0 };
    const updated = await prisma.group.update({ where: { id: group.id }, data: { events: json([event, ...events]), posts: json([eventPost, ...posts.filter((post) => post.id !== eventPost.id)]) } });
    return reply.code(201).send({ event, eventPost, groupEvents: array(updated.events) });
  });

  app.patch("/v1/groups/:id/events", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (!isMember(group, userId)) return reply.code(403).send({ error: "Vous devez être membre de ce groupe" });
    const body = request.body || {}; const events = array(group.events); const currentEvent = events.find((event) => event.id === body.eventId);
    if (!currentEvent) return reply.code(404).send({ error: "Événement introuvable" });
    const attendeeIds = Array.isArray(currentEvent.attendeeIds) ? currentEvent.attendeeIds : []; const alreadyJoined = attendeeIds.includes(userId); const shouldJoin = body.attending === undefined ? !alreadyJoined : Boolean(body.attending);
    const nextAttendeeIds = shouldJoin ? [...new Set([...attendeeIds, userId])] : attendeeIds.filter((id) => id !== userId); const updatedEvent = { ...currentEvent, attendeeIds: nextAttendeeIds, attendees: nextAttendeeIds.length };
    const updatedEvents = events.map((event) => event.id === updatedEvent.id ? updatedEvent : event); const posts = array(group.posts); const updatedPosts = posts.map((post) => post.event?.id === updatedEvent.id ? { ...post, event: updatedEvent } : post);
    await prisma.group.update({ where: { id: group.id }, data: { events: json(updatedEvents), posts: json(updatedPosts) } });
    return reply.send({ event: updatedEvent, attending: shouldJoin });
  });

  app.get("/v1/groups/:id/files/:fileId/download", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const group = await findGroup(request.params.id, reply); if (!group) return;
    if (!isMember(group, userId) && group.privacy !== "public") return reply.code(403).send({ error: "Accès interdit" });
    const file = array(group.files).find((item) => item?.id === request.params.fileId); const fileUrl = safeFileUrl(file?.url);
    if (!file || !fileUrl) return reply.code(404).send({ error: "Fichier introuvable" });
    let response; try { response = await fetch(fileUrl, { redirect: "error" }); } catch { return reply.code(502).send({ error: "Impossible de télécharger le fichier" }); }
    if (!response.ok) return reply.code(502).send({ error: "Le fichier n'est plus disponible" });
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_GROUP_FILE_BYTES) return reply.code(413).send({ error: "Le fichier dépasse la taille maximale autorisée" });
    const contentType = safeContentType(file.mimeType || response.headers.get("content-type"));
    const updatedFiles = array(group.files).map((item) => item.id === file.id ? { ...item, downloads: (Number(item.downloads) || 0) + 1 } : item);
    await prisma.group.update({ where: { id: group.id }, data: { files: json(updatedFiles) } });
    reply.header("Content-Type", contentType).header("Content-Disposition", `attachment; filename="${safeFileName(file.name)}"`).header("Cache-Control", "private, no-store");
    return reply.send(Buffer.from(await response.arrayBuffer()));
  });
}