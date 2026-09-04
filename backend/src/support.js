import nodemailer from "nodemailer";
import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const categories = new Set(["Question générale", "Problème technique", "Compte & sécurité", "Facturation", "Signaler un contenu"]);

function validRequest(body) {
  const category = String(body?.category || "");
  const subject = String(body?.subject || "").trim();
  const message = String(body?.message || "").trim();
  if (!categories.has(category) || subject.length < 5 || subject.length > 120 || message.length < 20 || message.length > 5000) return null;
  return { category, subject, message };
}

async function sendEmail({ to, replyTo, subject, text }) {
  if (!to) return;
  if ((process.env.EMAIL_PROVIDER || "smtp").toLowerCase() === "resend") {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], reply_to: replyTo || undefined, subject, text }) });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT || 587); const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !password) return;
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: password } });
  await transporter.sendMail({ from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER, to, replyTo, subject, text });
}

async function autoReply(payload, fallback) {
  if (!process.env.GROQ_API_KEY || !fallback) return fallback;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", messages: [{ role: "system", content: "Tu es l'assistant support de LynoraLink. Réponds en français, avec 2 à 4 phrases courtoises et concrètes. Base-toi uniquement sur la demande. Ne promets jamais de délai, remboursement ou action technique non confirmée. Retourne uniquement le texte, sans Markdown." }, { role: "user", content: `Catégorie : ${payload.category}\nSujet : ${payload.subject}\nDemande : ${payload.message}` }], temperature: 0.2, max_tokens: 250 }) });
    const data = await response.json().catch(() => ({})); const text = String(data?.choices?.[0]?.message?.content || "").trim();
    if (response.ok && text.length >= 2 && text.length <= 5000) return text;
  } catch (error) { console.warn("[support] AI auto-reply unavailable:", error.message); }
  return fallback;
}

export async function registerSupportRoutes(app) {
  app.get("/v1/support/content", async (_request, reply) => {
    const settings = await prisma.platformSetting.findMany({ where: { key: { in: ["supportFaq", "supportCgu"] } } });
    return reply.header("Cache-Control", "no-store, max-age=0").send({ content: Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) });
  });

  app.get("/v1/support", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const requests = await prisma.supportRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, category: true, subject: true, message: true, response: true, status: true, createdAt: true, respondedAt: true } });
    return reply.send({ requests });
  });

  app.post("/v1/support", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Vous devez être connecté pour contacter le support." });
    const payload = validRequest(request.body); if (!payload) return reply.code(400).send({ error: "Vérifiez la catégorie, le sujet et le message saisis." });
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const settings = await prisma.platformSetting.findMany({ where: { key: { in: ["supportAutoReplyEnabled", "supportAutoReplyMessage", "supportAutoReplyByCategory"] } }, select: { key: true, value: true } });
      const configured = Object.fromEntries(settings.map((setting) => [setting.key, setting.value])); let byCategory = {};
      try { byCategory = JSON.parse(configured.supportAutoReplyByCategory || "{}"); } catch {}
      const fallback = String(byCategory[payload.category] || configured.supportAutoReplyMessage || "").trim(); const enabled = configured.supportAutoReplyEnabled === "true" && fallback.length >= 2; const responseText = enabled ? await autoReply(payload, fallback) : "";
      const supportRequest = await prisma.supportRequest.create({ data: { ...payload, userId, ...(enabled ? { response: responseText, status: "answered", respondedAt: new Date() } : {}) }, select: { id: true, createdAt: true, response: true, status: true, respondedAt: true } });
      const supportEmail = process.env.SUPPORT_EMAIL_TO || process.env.ADMIN_EMAIL;
      await sendEmail({ to: supportEmail, replyTo: user?.email, subject: `[LynoraLink #${supportRequest.id.slice(-8).toUpperCase()}] ${payload.subject}`, text: [`Nouvelle demande de support LynoraLink #${supportRequest.id.slice(-8).toUpperCase()}`, `Utilisateur : ${user?.name || "Non renseigné"} <${user?.email || "e-mail inconnu"}>`, `Catégorie : ${payload.category}`, `Sujet : ${payload.subject}`, "", payload.message].join("\n") }).catch((error) => console.warn(`[support] notification email failed (${error.message})`));
      if (enabled && user?.email) await sendEmail({ to: user.email, subject: `Confirmation de votre demande - ${payload.subject}`, text: `Bonjour ${user.name || ""},\n\n${responseText}\n\nRéférence : #${supportRequest.id.slice(-8).toUpperCase()}` }).catch(() => {});
      return reply.code(201).send({ request: supportRequest });
    } catch (error) { request.log.error(error); return reply.code(500).send({ error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant." }); }
  });

  app.patch("/v1/support", async (request, reply) => {
    const adminId = await getSessionUserId(request); if (!adminId) return reply.code(401).send({ error: "Non authentifié" });
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true, email: true } }); const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (admin?.role !== "admin" && admin?.email?.toLowerCase() !== adminEmail) return reply.code(403).send({ error: "Accès administrateur requis." });
    const id = String(request.body?.id || ""); const responseText = String(request.body?.response || "").trim(); if (!id || responseText.length < 2 || responseText.length > 5000) return reply.code(400).send({ error: "Réponse ou identifiant invalide." });
    try { const item = await prisma.supportRequest.update({ where: { id }, data: { response: responseText, status: "answered", respondedAt: new Date(), respondedBy: adminId }, include: { user: { select: { name: true, email: true } } } }); await sendEmail({ to: item.user.email, subject: `Réponse LynoraLink - ${item.subject}`, text: `Bonjour ${item.user.name || ""},\n\n${responseText}\n\nRéférence : #${id.slice(-8).toUpperCase()}` }).catch(() => {}); return reply.send({ request: item }); } catch (error) { request.log.error(error); return reply.code(500).send({ error: "La réponse n'a pas pu être enregistrée." }); }
  });
}