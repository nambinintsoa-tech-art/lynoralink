import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

async function sendEmail({ to, subject, text, html }) {
  const configuredProvider = String(process.env.EMAIL_PROVIDER || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  const provider = configuredProvider || (process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL ? "brevo" : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? "smtp" : "resend");

  if (provider === "brevo") {
    const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!fromEmail || !apiKey) throw new Error("Configuration Brevo backend manquante");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: { email: fromEmail, name: process.env.BREVO_FROM_NAME || "LynoraLink" }, to: [{ email: to }], subject, textContent: text, htmlContent: html || text }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Brevo returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    return;
  }

  if (provider === "smtp") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
    if (!host || !user || !password) throw new Error("Configuration SMTP backend manquante");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass: password },
    });
    await transporter.sendMail({ from: process.env.NO_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL || user, to, subject, text, html });
    return;
  }

  const from = process.env.NO_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) throw new Error("Configuration email backend manquante");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html }) });
  if (!response.ok) throw new Error("Échec d'envoi du message email");
}

async function createCode(userId, key, email, subject) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await prisma.userSetting.upsert({ where: { userId_key: { userId, key } }, update: { value: JSON.stringify({ hash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: Date.now() + 600000 }) }, create: { userId, key, value: JSON.stringify({ hash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: Date.now() + 600000 }) } });
  await sendEmail({ to: email, subject, text: `Votre code de sécurité LynoraLink est ${code}. Il expire dans 10 minutes.` });
}

export async function registerAccountSecurityRoutes(app) {
  app.get("/v1/sessions", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const sessions = await prisma.session.findMany({ where: { userId }, orderBy: { expires: "desc" } });
    const now = new Date();
    return reply.send({ sessions: sessions.map((session) => ({ id: session.id, sessionToken: session.sessionToken, expires: session.expires, expired: session.expires < now, device: "Session active", location: "En ligne", current: session.expires >= now })) });
  });

  app.delete("/v1/sessions/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const result = await prisma.session.deleteMany({ where: { id: request.params.id, userId } });
    if (!result.count) return reply.code(404).send({ error: "Session introuvable" });
    return reply.send({ ok: true });
  });

  app.post("/v1/account/password", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const { currentPassword, newPassword, otp } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!currentPassword || typeof newPassword !== "string" || newPassword.length < 8) return reply.code(400).send({ error: "Mot de passe actuel et nouveau mot de passe de 8 caractères requis" });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) return reply.code(400).send({ error: "Compte OAuth non compatible" });
    if (!await bcrypt.compare(currentPassword, user.password)) return reply.code(401).send({ error: "Mot de passe actuel incorrect" });
    const twoFactor = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "twoFactor" } } });
    if (twoFactor?.value === "true") {
      if (!otp) { try { await createCode(userId, "passwordChangeTwoFactorChallenge", user.email, "Code de changement de mot de passe LynoraLink"); } catch { return reply.code(503).send({ error: "Impossible d'envoyer le code de sécurité" }); } return reply.send({ requiresTwoFactor: true }); }
      const challengeRow = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "passwordChangeTwoFactorChallenge" } } });
      let challenge; try { challenge = JSON.parse(challengeRow?.value || "null"); } catch { challenge = null; }
      const hash = crypto.createHash("sha256").update(String(otp || "")).digest("hex");
      if (!otp || !challenge || challenge.expiresAt < Date.now() || challenge.hash !== hash) return reply.code(401).send({ error: "Code de sécurité invalide ou expiré" });
      await prisma.userSetting.delete({ where: { userId_key: { userId, key: "passwordChangeTwoFactorChallenge" } } });
    }
    await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    return reply.send({ ok: true });
  });

  app.delete("/v1/account", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user?.password || !await bcrypt.compare(String(request.body?.currentPassword || ""), user.password)) return reply.code(403).send({ error: "Mot de passe incorrect" });
    await prisma.user.delete({ where: { id: userId } });
    return reply.send({ deleted: true });
  });

  app.post("/v1/auth/2fa/request", async (request, reply) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, password: true } });
    if (!user?.password || !await bcrypt.compare(password, user.password)) return reply.code(401).send({ error: "Email ou mot de passe incorrect" });
    const enabled = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: "twoFactor" } } });
    if (enabled?.value !== "true") return reply.send({ requiresTwoFactor: false });

    const hasMailProvider = Boolean(
      process.env.EMAIL_PROVIDER ||
      process.env.BREVO_API_KEY ||
      process.env.SMTP_HOST ||
      process.env.RESEND_API_KEY
    );

    if (process.env.NODE_ENV !== "production" && (!hasMailProvider || !process.env.SMTP_HOST && !process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY)) {
      return reply.send({ requiresTwoFactor: false, warning: "2FA disabled in local mode without working email provider" });
    }

    try { await createCode(user.id, "twoFactorChallenge", user.email, "Votre code de sécurité LynoraLink"); } catch {
      if (process.env.NODE_ENV !== "production") {
        return reply.send({ requiresTwoFactor: false, warning: "2FA disabled in local mode because email delivery failed" });
      }
      return reply.code(503).send({ error: "Impossible d'envoyer le code de sécurité" });
    }
    return reply.send({ requiresTwoFactor: true });
  });

  app.patch("/v1/account/email", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.currentPassword || "");
    if (!userId || !/^\S+@\S+\.\S+$/.test(email) || !password) return reply.code(400).send({ error: "Nouvel e-mail et mot de passe requis" });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password || !await bcrypt.compare(password, user.password)) return reply.code(401).send({ error: "Mot de passe incorrect" });
    if (email === user.email.toLowerCase()) return reply.code(400).send({ error: "Cet e-mail est déjà utilisé" });
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return reply.code(409).send({ error: "Un compte existe déjà avec cet e-mail" });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({ data: { identifier: JSON.stringify({ type: "email-change", userId, email }), token, expires: new Date(Date.now() + 86400000) } });
    try { await sendEmail({ to: email, subject: "Confirmez votre nouvelle adresse LynoraLink", text: `Confirmez votre adresse : ${(process.env.APP_URL || "http://localhost:3000")}/verify-email?token=${token}` }); } catch { await prisma.verificationToken.deleteMany({ where: { token } }); return reply.code(503).send({ error: "Impossible d'envoyer le lien de confirmation" }); }
    return reply.send({ ok: true, pendingVerification: true, email });
  });
}
