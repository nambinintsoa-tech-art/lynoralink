import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import nodemailer from "nodemailer";
import { prisma } from "./db.js";
import { getSessionUserId } from "./auth.js";

const strongPassword = (value) => typeof value === "string" && value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
const MINIMUM_AGE = 16;
const genericResetMessage = "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.";
const genericRegistrationMessage = "Si un compte non confirmé correspond à cette adresse, un nouveau code vient d'être envoyé.";

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderEmailHtml(subject, text) {
  const logoUrl = process.env.EMAIL_LOGO_URL || `${process.env.APP_URL || "https://lynoralink.vercel.app"}/logo_lynora.svg`;
  const safeText = escapeHtml(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1f6feb;font-weight:600;">$1</a>').replace(/\n/g, "<br>");
  const code = text.match(/\b\d{6}\b/)?.[0];
  const content = code
    ? `<p style="margin:0 0 18px;color:#40516d;font-size:16px;line-height:1.6;">Votre code de confirmation est :</p><div style="margin:0 auto 20px;padding:16px 20px;border:1px solid #ead08a;border-radius:12px;background:#fff9e9;color:#152a4d;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;">${code}</div><p style="margin:0;color:#6b7890;font-size:14px;line-height:1.6;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>`
    : `<p style="margin:0;color:#40516d;font-size:16px;line-height:1.7;">${safeText}</p>`;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#152a4d;"><div style="padding:32px 16px;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e1e7ef;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(21,42,77,.08);"><div style="padding:26px 28px;background:#152a4d;text-align:center;"><img src="${escapeHtml(logoUrl)}" width="64" height="64" alt="LynoraLink" style="display:block;margin:0 auto 12px;border-radius:50%;"><div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.2px;">LynoraLink</div></div><div style="padding:30px 28px;"><h1 style="margin:0 0 20px;color:#152a4d;font-size:24px;line-height:1.3;">${escapeHtml(subject)}</h1>${content}</div><div style="padding:18px 28px;border-top:1px solid #e1e7ef;color:#8290a5;font-size:12px;line-height:1.5;text-align:center;">LynoraLink · Le réseau qui crée des connexions utiles</div></div></div></body></html>`;
}

async function sendEmail({ to, subject, text }) {
  const html = renderEmailHtml(subject, text);
  const configuredProvider = String(process.env.EMAIL_PROVIDER || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  const provider = configuredProvider || (process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL ? "brevo" : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? "smtp" : "resend");
  if (provider === "brevo") {
    const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!fromEmail || !apiKey) throw new Error("Configuration Brevo backend manquante");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: { email: fromEmail, name: process.env.BREVO_FROM_NAME || "LynoraLink" }, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
    });
    if (!response.ok) {
      let details = "";
      try {
        const payload = await response.json();
        details = typeof payload?.message === "string" ? `: ${payload.message}` : "";
      } catch {}
      throw new Error(`Brevo returned ${response.status}${details}`);
    }
    return;
  }
  if (provider === "smtp") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
    if (!host || !user || !password) throw new Error("Configuration SMTP backend manquante");
    const smtpAddress = (await dns.lookup(host, { family: 4 })).address;
    const transporter = nodemailer.createTransport({
      host: smtpAddress,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      family: 4,
      tls: { servername: host },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user, pass: password },
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM_EMAIL || user, to, subject, text, html });
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) throw new Error("Configuration Resend backend manquante");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html }) });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

function birthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function isAtLeastMinimumAge(date) {
  const today = new Date();
  const latestBirthDate = new Date(Date.UTC(today.getUTCFullYear() - MINIMUM_AGE, today.getUTCMonth(), today.getUTCDate(), 12));
  return date <= latestBirthDate;
}

async function verifyRegistration(email, code) {
  const record = await prisma.verificationToken.findFirst({ where: { identifier: email, token: code } });
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (!record || record.expires < new Date() || !pending) return false;
  await prisma.$transaction([prisma.user.create({ data: { name: pending.name, email: pending.email, password: pending.password, title: pending.title, birthDate: pending.birthDate, emailVerified: new Date() } }), prisma.pendingRegistration.delete({ where: { email } }), prisma.verificationToken.delete({ where: { token: record.token } })]);
  return true;
}

export async function registerIdentityRoutes(app) {
  app.post("/v1/verify-email/resend", async (request, reply) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    if (!validEmail(email)) return reply.send({ message: genericRegistrationMessage });
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) return reply.send({ message: genericRegistrationMessage });
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.verificationToken.create({ data: { identifier: email, token: code, expires: new Date(Date.now() + 600000) } });
    try { await sendEmail({ to: email, subject: "Votre code de confirmation LynoraLink", text: `Votre code de confirmation est ${code}. Il expire dans 10 minutes.` }); } catch { return reply.send({ message: genericRegistrationMessage }); }
    return reply.send({ message: genericRegistrationMessage });
  });

  app.post("/v1/register", async (request, reply) => {
    const body = request.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const parsedBirthDate = birthDate(body.birthDate);
    if (typeof body.name !== "string" || body.name.trim().length < 2 || !validEmail(email) || !strongPassword(body.password) || !parsedBirthDate) return reply.code(400).send({ error: "Données d'inscription invalides" });
    if (!isAtLeastMinimumAge(parsedBirthDate)) return reply.code(400).send({ error: "Vous devez avoir au moins 16 ans pour créer un compte." });
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
    if (existing?.emailVerified) return reply.code(409).send({ error: "Un compte existe déjà avec cet email." });
    if (existing) await prisma.user.delete({ where: { id: existing.id } });
    await prisma.pendingRegistration.upsert({ where: { email }, update: { name: body.name.trim(), title: body.title || null, birthDate: parsedBirthDate, password: await bcrypt.hash(body.password, 10) }, create: { email, name: body.name.trim(), title: body.title || null, birthDate: parsedBirthDate, password: await bcrypt.hash(body.password, 10) } });
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.verificationToken.create({ data: { identifier: email, token: code, expires: new Date(Date.now() + 600000) } });
    try { await sendEmail({ to: email, subject: "Votre code de confirmation LynoraLink", text: `Votre code de confirmation est ${code}. Il expire dans 10 minutes.` }); } catch (error) { const configuredProvider = String(process.env.EMAIL_PROVIDER || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase(); const provider = configuredProvider || (process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL ? "brevo" : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? "smtp" : "resend"); request.log.error({ err: error, provider }, "Registration email delivery failed"); await prisma.pendingRegistration.delete({ where: { email } }); await prisma.verificationToken.deleteMany({ where: { identifier: email } }); return reply.code(503).send({ error: "Impossible d'envoyer le code de confirmation." }); }
    return reply.code(201).send({ message: "Un code de confirmation à 6 chiffres a été envoyé à votre adresse email." });
  });

  app.post("/v1/verify-email", async (request, reply) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const code = String(request.body?.code || "");
    if (email && code) return (await verifyRegistration(email, code)) ? reply.send({ verified: true, message: "Adresse email confirmée. Vous pouvez vous connecter." }) : reply.code(400).send({ error: "Code expiré, invalide ou déjà utilisé." });
    const token = String(request.query?.token || request.body?.token || "");
    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) return reply.code(400).send({ error: "Lien expiré ou déjà utilisé." });
    let payload; try { payload = JSON.parse(record.identifier); } catch { payload = null; }
    if (payload?.type !== "email-change") return reply.code(400).send({ error: "Lien de confirmation invalide." });
    await prisma.$transaction([prisma.user.update({ where: { id: payload.userId }, data: { email: payload.email, emailVerified: new Date() } }), prisma.verificationToken.delete({ where: { token } })]);
    return reply.send({ verified: true, message: "Adresse email confirmée. Vous pouvez vous connecter." });
  });

  app.post("/v1/forgot-password", async (request, reply) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    if (!validEmail(email)) return reply.send({ ok: true, message: genericResetMessage });
    const user = await prisma.user.findUnique({ where: { email }, select: { password: true } });
    if (!user?.password) return reply.send({ ok: true, message: genericResetMessage });
    await prisma.verificationToken.deleteMany({ where: { identifier: `password-reset:${email}` } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({ data: { identifier: `password-reset:${email}`, token, expires: new Date(Date.now() + 1800000) } });
    try { await sendEmail({ to: email, subject: "Réinitialisez votre mot de passe LynoraLink", text: `Réinitialisez votre mot de passe : ${(process.env.APP_URL || "http://localhost:3000")}/reset-password?token=${encodeURIComponent(token)}\n\nCe lien expire dans 30 minutes.` }); } catch { return reply.code(503).send({ ok: false, error: "Le lien de réinitialisation n'a pas pu être envoyé." }); }
    return reply.send({ ok: true, message: genericResetMessage });
  });

  app.post("/v1/reset-password", async (request, reply) => {
    const token = String(request.body?.token || "");
    if (!token || !strongPassword(request.body?.password)) return reply.code(400).send({ error: "Lien invalide ou mot de passe insuffisamment sécurisé." });
    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || !record.identifier.startsWith("password-reset:") || record.expires < new Date()) return reply.code(400).send({ error: "Ce lien est invalide ou expiré." });
    await prisma.$transaction([prisma.user.update({ where: { email: record.identifier.slice("password-reset:".length) }, data: { password: await bcrypt.hash(request.body.password, 10), emailVerified: new Date() } }), prisma.verificationToken.delete({ where: { token } })]);
    return reply.send({ ok: true });
  });

  app.get("/v1/account", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ accounts: [] });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ accounts: [] });
    return reply.send({ accounts: [{ id: user.id, name: user.name || user.email || "Compte principal", handle: user.email ? `@${user.email.split("@")[0]}` : "@compte", online: true, verified: Boolean(user.plan || user.title), photoUrl: user.image || null, provider: "email" }] });
  });
}