import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import nodemailer from "nodemailer";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGroq } from "@/lib/groq";

const supportRequestSchema = z.object({
  category: z.enum(["Question générale", "Problème technique", "Compte & sécurité", "Facturation", "Signaler un contenu"]),
  subject: z.string().trim().min(5).max(120),
  message: z.string().trim().min(20).max(5000),
});

async function getSession() {
  return getServerSession(authOptions);
}

async function sendSupportEmail({ to, replyTo, subject, text }) {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn("[support] Resend is selected but RESEND_API_KEY or RESEND_FROM_EMAIL is missing");
      return;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], reply_to: replyTo || undefined, subject, text }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend ${response.status}: ${detail.slice(0, 200)}`);
    }
    return;
  }

  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword) {
    console.warn("[support] SMTP is not configured; request saved without email notification");
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: process.env.SMTP_USER, pass: smtpPassword },
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER, to, replyTo, subject, text });
}

async function generateSupportAutoReply({ category, subject, message, fallback }) {
  try {
    const response = await callGroq([
      { role: "system", content: "Tu es l'assistant support de LynoraLink. Réponds en français, avec 2 à 4 phrases courtoises et concrètes. Base-toi uniquement sur la demande reçue. Ne promets jamais de délai, remboursement ou action technique non confirmée. Si tu ne connais pas la solution, indique qu'une vérification humaine est nécessaire. Retourne uniquement le texte de la réponse, sans titre ni Markdown." },
      { role: "user", content: `Catégorie : ${category}\nSujet : ${subject}\nDemande : ${message}` },
    ], { temperature: 0.2, max_tokens: 250 });
    const generated = String(response || "").trim().replace(/^```[\s\S]*?```$/g, "").trim();
    if (generated.length >= 2 && generated.length <= 5000) return generated;
  } catch (error) {
    console.warn("[support] AI auto-reply unavailable:", error.message);
  }
  return fallback;
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const requests = await prisma.supportRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, category: true, subject: true, message: true, response: true, status: true, createdAt: true, respondedAt: true },
  });
  return NextResponse.json({ requests });
}

export async function PATCH(request) {
  const session = await getSession();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin = session?.user?.id && (session.user.role === "admin" || session.user.email?.toLowerCase() === adminEmail);
  if (!isAdmin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  try {
    const body = await request.json();
    const requestId = z.string().min(1).parse(body?.id);
    const responseText = z.string().trim().min(2).max(5000).parse(body?.response);
    const supportRequest = await prisma.supportRequest.update({
      where: { id: requestId },
      data: { response: responseText, status: "answered", respondedAt: new Date(), respondedBy: session.user.id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (supportRequest.user.email) await sendSupportEmail({
      to: supportRequest.user.email,
      subject: `Réponse LynoraLink - ${supportRequest.subject}`,
      text: `Bonjour ${supportRequest.user.name || ""},\n\n${responseText}\n\nRéférence : #${requestId.slice(-8).toUpperCase()}`,
    }).catch((error) => console.warn(`[support] response email failed (${error.code || "EMAIL_ERROR"})`));
    return NextResponse.json({ request: supportRequest });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Réponse ou identifiant invalide." }, { status: 400 });
    console.error("[support] unable to answer request", error);
    return NextResponse.json({ error: "La réponse n'a pas pu être enregistrée." }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Vous devez être connecté pour contacter le support." }, { status: 401 });
  }

  try {
    const payload = supportRequestSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const autoReplySettings = await prisma.platformSetting.findMany({
      where: { key: { in: ["supportAutoReplyEnabled", "supportAutoReplyMessage", "supportAutoReplyByCategory"] } },
      select: { key: true, value: true },
    });
    const autoReply = Object.fromEntries(autoReplySettings.map((setting) => [setting.key, setting.value]));
    let byCategory = {};
    try { byCategory = JSON.parse(autoReply.supportAutoReplyByCategory || "{}"); } catch {}
    const configuredReply = String(byCategory[payload.category] || autoReply.supportAutoReplyMessage || "").trim();
    const autoReplyEnabled = autoReply.supportAutoReplyEnabled === "true" && configuredReply.length >= 2;
    const autoReplyMessage = autoReplyEnabled ? await generateSupportAutoReply({ ...payload, fallback: configuredReply }) : "";
    const supportRequest = await prisma.supportRequest.create({
      data: {
        ...payload,
        userId: session.user.id,
        ...(autoReplyEnabled ? { response: autoReplyMessage, status: "answered", respondedAt: new Date() } : {}),
      },
      select: { id: true, createdAt: true, response: true, status: true, respondedAt: true },
    });

    const supportEmailTo = process.env.SUPPORT_EMAIL_TO || process.env.ADMIN_EMAIL;
    if (supportEmailTo) await sendSupportEmail({
      to: supportEmailTo,
      replyTo: user?.email,
      subject: `[LynoraLink #${supportRequest.id.slice(-8).toUpperCase()}] ${payload.subject}`,
      text: [
        `Nouvelle demande de support LynoraLink #${supportRequest.id.slice(-8).toUpperCase()}`,
        `Utilisateur : ${user?.name || "Non renseigné"} <${user?.email || "e-mail inconnu"}>`,
        `Catégorie : ${payload.category}`,
        `Sujet : ${payload.subject}`,
        "",
        payload.message,
      ].join("\n"),
    }).catch((error) => console.warn(`[support] notification email failed (${error.code || "EMAIL_ERROR"})`));

    if (autoReplyEnabled && user?.email) await sendSupportEmail({
      to: user.email,
      subject: `Confirmation de votre demande - ${payload.subject}`,
      text: `Bonjour ${user.name || ""},\n\n${autoReplyMessage}\n\nRéférence : #${supportRequest.id.slice(-8).toUpperCase()}`,
    }).catch((error) => console.warn(`[support] auto-reply email failed (${error.code || "EMAIL_ERROR"})`));

    return NextResponse.json({ request: supportRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Vérifiez la catégorie, le sujet et le message saisis." }, { status: 400 });
    }
    console.error("[support] unable to create request", error);
    return NextResponse.json({ error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant." }, { status: 500 });
  }
}