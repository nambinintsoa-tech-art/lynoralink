import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGroq } from "@/lib/groq";

const FALLBACK_REPLY = "Bonjour, merci pour votre message. Votre demande a été prise en compte et notre équipe reviendra vers vous si une vérification complémentaire est nécessaire.";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, email: true } });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  return user?.role === "admin" || (adminEmail && user.email?.toLowerCase() === adminEmail) ? user : null;
}

async function generateReply(request, configuredMessage, categoryMessage) {
  try {
    const response = await callGroq([
      {
        role: "system",
        content: "Tu es l'assistant support de LynoraLink. Réponds en français, avec 2 à 4 phrases courtoises et concrètes. Base-toi uniquement sur la demande reçue. Ne promets jamais de délai, remboursement ou action technique non confirmée. Si tu ne connais pas la solution, indique qu'une vérification humaine est nécessaire. Retourne uniquement le texte de la réponse, sans titre ni Markdown.",
      },
      {
        role: "user",
        content: `Catégorie : ${request.category}\nSujet : ${request.subject}\nDemande : ${request.message}`,
      },
    ], { temperature: 0.2, max_tokens: 250 });
    const cleaned = String(response || "").trim().replace(/^```[\s\S]*?```$/g, "").trim();
    if (cleaned.length >= 2 && cleaned.length <= 5000) return { text: cleaned, source: "ai" };
  } catch (error) {
    console.warn("[admin/ai/support] provider unavailable:", error.message);
  }
  return { text: String(categoryMessage || configuredMessage || FALLBACK_REPLY).trim(), source: "fallback" };
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  try {
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["supportAutoReplyMessage", "supportAutoReplyByCategory"] } },
      select: { key: true, value: true },
    });
    const settingMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    let byCategory = {};
    try { byCategory = JSON.parse(settingMap.supportAutoReplyByCategory || "{}"); } catch {}
    const requests = await prisma.supportRequest.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { user: { select: { id: true, name: true } } },
    });

    const processed = [];
    for (const request of requests) {
      const reply = await generateReply(request, settingMap.supportAutoReplyMessage, byCategory[request.category]);
      const updated = await prisma.supportRequest.update({
        where: { id: request.id },
        data: { response: reply.text, status: "answered", respondedAt: new Date(), respondedBy: admin.id },
        select: { id: true, subject: true, status: true, response: true, respondedAt: true, userId: true },
      });
      await prisma.notification.create({
        data: {
          userId: request.userId,
          senderId: admin.id,
          type: "support_reply",
          actor: "LynoraLink",
          initials: "LL",
          text: `Réponse automatique à votre demande : ${request.subject}`,
          message: reply.text,
          meta: JSON.stringify({
            supportRequestId: request.id,
            source: reply.source,
            avatarUrl: "/logo_lynora.svg",
            actorAvatar: "/logo_lynora.svg",
          }),
        },
      });
      processed.push({ ...updated, source: reply.source });
    }

    return NextResponse.json({ ok: true, processed, count: processed.length, message: processed.length ? `${processed.length} réponse${processed.length > 1 ? "s" : ""} automatique${processed.length > 1 ? "s" : ""} envoyée${processed.length > 1 ? "s" : ""}.` : "Aucune demande support ouverte." });
  } catch (error) {
    console.error("[admin/ai/support] processing failed", error);
    return NextResponse.json({ error: "Les réponses automatiques n'ont pas pu être envoyées." }, { status: 500 });
  }
}
