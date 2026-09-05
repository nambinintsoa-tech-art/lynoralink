import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "./db.js";
import { getSessionUserId } from "./auth.js";

const strongPassword = (value) => typeof value === "string" && value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
const genericResetMessage = "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.";
const genericRegistrationMessage = "Si un compte non confirmé correspond à cette adresse, un nouveau code vient d'être envoyé.";

async function sendEmail({ to, subject, text }) {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
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
    await transporter.sendMail({ from: process.env.SMTP_FROM_EMAIL || user, to, subject, text });
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) throw new Error("Configuration Resend backend manquante");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text }) });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

function birthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
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
    if (typeof body.name !== "string" || body.name.trim().length < 2 || !validEmail(email) || !strongPassword(body.password) || !birthDate(body.birthDate)) return reply.code(400).send({ error: "Données d'inscription invalides" });
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
    if (existing?.emailVerified) return reply.code(409).send({ error: "Un compte existe déjà avec cet email." });
    if (existing) await prisma.user.delete({ where: { id: existing.id } });
    await prisma.pendingRegistration.upsert({ where: { email }, update: { name: body.name.trim(), title: body.title || null, birthDate: birthDate(body.birthDate), password: await bcrypt.hash(body.password, 10) }, create: { email, name: body.name.trim(), title: body.title || null, birthDate: birthDate(body.birthDate), password: await bcrypt.hash(body.password, 10) } });
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.verificationToken.create({ data: { identifier: email, token: code, expires: new Date(Date.now() + 600000) } });
    try { await sendEmail({ to: email, subject: "Votre code de confirmation LynoraLink", text: `Votre code de confirmation est ${code}. Il expire dans 10 minutes.` }); } catch { await prisma.pendingRegistration.delete({ where: { email } }); await prisma.verificationToken.deleteMany({ where: { identifier: email } }); return reply.code(503).send({ error: "Impossible d'envoyer le code de confirmation." }); }
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