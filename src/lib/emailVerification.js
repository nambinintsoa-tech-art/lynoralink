import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

function isSmtpConfigured() {
  const smtpPassword = (process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword);
}

function getTransporter() {
  const smtpPassword = (process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword) {
    throw new Error("Configuration SMTP manquante");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    requireTLS: Number(process.env.SMTP_PORT || 587) === 587,
    auth: { user: process.env.SMTP_USER, pass: smtpPassword },
  });
}

async function sendWithSmtp({ to, subject, text, html }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: getSenderAddress(),
    to,
    subject,
    text,
    html,
  });
}

function isResendDomainVerificationFailure(message = "") {
  return /domain.*not verified|not verified.*domain|validation_error|resend 403/i.test(message);
}

async function sendWithConfiguredProvider({ to, subject, text, html }) {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    if (!apiKey || !from) {
      throw new Error("Configuration Resend manquante");
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
        cache: "no-store",
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const message = `Resend ${response.status}: ${detail.slice(0, 200)}`;
        if (response.status === 403 && isResendDomainVerificationFailure(message) && isSmtpConfigured()) {
          console.warn("Resend domain not verified; falling back to SMTP provider.");
          await sendWithSmtp({ to, subject, text, html });
          return;
        }
        throw new Error(message);
      }

      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isResendDomainVerificationFailure(message) && isSmtpConfigured()) {
        console.warn("Resend failed; falling back to SMTP provider.");
        await sendWithSmtp({ to, subject, text, html });
        return;
      }
      throw error;
    }
  }

  await sendWithSmtp({ to, subject, text, html });
}

function getSenderAddress() {
  const smtpUser = process.env.SMTP_USER;
  const configuredSender = process.env.SMTP_FROM_EMAIL;
  const smtpHost = (process.env.SMTP_HOST || "").toLowerCase();
  const userDomain = smtpUser?.split("@")[1]?.toLowerCase();
  const senderDomain = configuredSender?.split("@")[1]?.toLowerCase();

  const senderEmail = smtpHost.includes("gmail.com") || smtpHost.includes("googlemail.com")
    ? (userDomain && senderDomain && userDomain !== senderDomain ? smtpUser : (configuredSender || smtpUser))
    : (configuredSender || smtpUser);
  return `LynoraLink - NoReply <${senderEmail}>`;
}

function buildEmailHtml({ title, message, actionLabel, actionUrl, code, expiry, baseUrl }) {
  const action = actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 0"><tr><td style="border-radius:8px;background:#D9A536"><a href="${actionUrl}" style="display:inline-block;padding:13px 24px;color:#0F3352;text-decoration:none;font-size:14px;font-weight:700">${actionLabel}</a></td></tr></table>`
    : "";
  const codeBlock = code
    ? `<div style="margin:26px 0 6px;padding:18px 12px;background:#EFF4F9;border:1px solid #DCE7F1;border-radius:10px;color:#0F3352;font-size:30px;font-weight:800;letter-spacing:8px;text-align:center">${code}</div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#EFF4F9;font-family:Arial,Helvetica,sans-serif;color:#132433"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#EFF4F9;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3EAF1;border-radius:14px;overflow:hidden"><tr><td style="padding:20px 28px;background:#0F3352;color:#FFFFFF"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="vertical-align:middle"><img src="${baseUrl}/logo_lynora.svg" width="42" height="42" alt="LynoraLink" style="display:block;border:0;border-radius:50%" /></td><td style="padding-left:12px;vertical-align:middle;font-size:22px;font-weight:800;white-space:nowrap"><span style="color:#F6D374">Lynora</span><span style="color:#FFFFFF">Link</span></td></tr></table></td></tr><tr><td style="padding:32px 28px 34px"><h1 style="margin:0 0 14px;color:#0F3352;font-size:24px;line-height:1.25">${title}</h1><p style="margin:0;color:#5C7488;font-size:15px;line-height:1.65">${message}</p>${codeBlock}${action}<p style="margin:26px 0 0;color:#8CA0B3;font-size:12px;line-height:1.5">Ce message a été envoyé automatiquement par LynoraLink. ${expiry}</p></td></tr><tr><td style="padding:16px 28px;background:#F7FAFD;border-top:1px solid #E3EAF1;color:#8CA0B3;font-size:11px">LynoraLink · Le réseau qui vous relie</td></tr></table></td></tr></table></body></html>`;
}

function getBaseUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function sendVerificationEmail(email, token) {
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendWithConfiguredProvider({
    to: email,
    subject: "Confirmez votre adresse email LynoraLink",
    text: `Confirmez votre adresse email en ouvrant ce lien : ${verificationUrl}\n\nCe lien expire dans 24 heures.`,
    html: buildEmailHtml({ title: "Confirmez votre adresse e-mail", message: "Bienvenue sur LynoraLink. Confirmez votre adresse e-mail pour activer votre compte.", actionLabel: "Confirmer mon adresse e-mail", actionUrl: verificationUrl, expiry: "Ce lien expire dans 24 heures.", baseUrl }),
  });
}

export async function sendRegistrationCode(email, code) {
  await sendWithConfiguredProvider({
    to: email,
    subject: "Votre code de confirmation LynoraLink",
    text: `Votre code de confirmation est ${code}. Il expire dans 10 minutes.`,
    html: buildEmailHtml({ title: "Confirmez votre adresse e-mail", message: "Bienvenue sur LynoraLink. Saisissez ce code pour activer votre compte.", code, expiry: "Ce code expire dans 10 minutes.", baseUrl: getBaseUrl() }),
  });
}

export async function sendPasswordResetEmail(email, token) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendWithConfiguredProvider({
      to: email,
      subject: "Réinitialisez votre mot de passe LynoraLink",
      text: `Réinitialisez votre mot de passe en ouvrant ce lien : ${resetUrl}\n\nCe lien expire dans 30 minutes.`,
      html: buildEmailHtml({ title: "Réinitialisez votre mot de passe", message: "Une demande de réinitialisation a été reçue pour votre compte LynoraLink.", actionLabel: "Réinitialiser mon mot de passe", actionUrl: resetUrl, expiry: "Ce lien expire dans 30 minutes.", baseUrl }),
    });
    return true;
  } catch (error) {
    console.error("Password reset email failed:", error);
    if (process.env.NODE_ENV !== "production") {
      console.info("Password reset debug URL:", resetUrl);
    }
    throw error;
  }
}

export async function sendNewDeviceAlertEmail(email, deviceName) {
  const safeDeviceName = String(deviceName || "un appareil inconnu");
  await sendWithConfiguredProvider({
    to: email,
    subject: "Nouvelle connexion à votre compte LynoraLink",
    text: `Une nouvelle connexion à votre compte LynoraLink a été détectée depuis ${safeDeviceName} le ${new Date().toLocaleString("fr-FR")}.

Si vous êtes à l'origine de cette connexion, aucune action n'est nécessaire. Si ce n'est pas vous, changez immédiatement votre mot de passe et révoquez vos sessions actives depuis les paramètres de sécurité.`,
    html: buildEmailHtml({
      title: "Nouvelle connexion détectée",
      message: `Une nouvelle connexion à votre compte a été détectée depuis <strong>${safeDeviceName}</strong>. Si vous êtes à l'origine de cette connexion, aucune action n'est nécessaire. Si ce n'est pas vous, sécurisez immédiatement votre compte depuis les paramètres de sécurité.`,
      expiry: "Cet email est une alerte de sécurité automatique.",
      baseUrl: getBaseUrl(),
    }),
  });
}

export async function sendTwoFactorCode(email, code) {
  await sendWithConfiguredProvider({
    to: email,
    subject: "Votre code de connexion LynoraLink",
    text: `Votre code de connexion est ${code}. Il expire dans 10 minutes.`,
    html: buildEmailHtml({ title: "Votre code de sécurité", message: "Utilisez ce code pour confirmer votre identité et continuer sur LynoraLink.", code, expiry: "Ce code expire dans 10 minutes.", baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000" }),
  });
}

export async function verifyEmailToken(token) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { token } });
    return false;
  }

  let payload = null;
  try {
    payload = JSON.parse(record.identifier);
  } catch {
    payload = null;
  }

  if (payload && payload.type === "email-change") {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      await prisma.verificationToken.delete({ where: { token } });
      return false;
    }

    const taken = await prisma.user.findUnique({ where: { email: payload.email } });
    if (taken && taken.id !== user.id) {
      await prisma.verificationToken.delete({ where: { token } });
      return false;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { email: payload.email, emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);
    return true;
  }

  const pending = await prisma.pendingRegistration.findUnique({ where: { email: record.identifier } });
  if (!pending) {
    await prisma.verificationToken.delete({ where: { token } });
    return false;
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.password,
        title: pending.title,
        birthDate: pending.birthDate,
        emailVerified: new Date(),
      },
    }),
    prisma.pendingRegistration.delete({ where: { email: pending.email } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
  return true;
}

export async function verifyRegistrationCode(email, code) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: normalizedEmail, token: code },
  });
  if (!record || record.expires < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { token: record.token } });
    return false;
  }

  const pending = await prisma.pendingRegistration.findUnique({ where: { email: normalizedEmail } });
  if (!pending) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    return false;
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.password,
        title: pending.title,
        birthDate: pending.birthDate,
        emailVerified: new Date(),
      },
    }),
    prisma.pendingRegistration.delete({ where: { email: pending.email } }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);
  return true;
}
