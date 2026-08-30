import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin = session?.user?.email && (session.user.role === "admin" || session.user.email.toLowerCase() === adminEmail);
  return isAdmin ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  const [requests, settings] = await Promise.all([
    prisma.supportRequest.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true, image: true } } } }),
    prisma.platformSetting.findMany({ where: { key: { in: ["supportFaq", "supportCgu", "supportAutoReplyEnabled", "supportAutoReplyMessage", "supportAutoReplyByCategory"] } } }),
  ]);
  const content = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  return NextResponse.json({ requests, content, autoReply: {
    enabled: content.supportAutoReplyEnabled === "true",
    message: content.supportAutoReplyMessage || "Votre demande a bien été reçue. Notre équipe vous répondra dans les meilleurs délais.",
    byCategory: (() => { try { return JSON.parse(content.supportAutoReplyByCategory || "{}"); } catch { return {}; } })(),
  } });
}

export async function PATCH(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  try {
    const body = await request.json();
    if (body?.action === "content") {
      const key = body.key === "supportCgu" ? "supportCgu" : "supportFaq";
      const value = String(body.value || "").slice(0, 50000);
      await prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
      return NextResponse.json({ ok: true });
    }
    if (body?.action === "autoReply") {
      const enabled = String(Boolean(body.enabled));
      const message = String(body.message || "").trim().slice(0, 1000);
      if (message.length < 2) return NextResponse.json({ error: "Le message automatique est trop court." }, { status: 400 });
      const categories = ["Question générale", "Problème technique", "Compte & sécurité", "Facturation", "Signaler un contenu"];
      const byCategory = Object.fromEntries(categories.map((category) => [category, String(body.byCategory?.[category] || "").trim().slice(0, 1000)]).filter(([, value]) => value));
      await Promise.all([
        prisma.platformSetting.upsert({ where: { key: "supportAutoReplyEnabled" }, update: { value: enabled }, create: { key: "supportAutoReplyEnabled", value: enabled } }),
        prisma.platformSetting.upsert({ where: { key: "supportAutoReplyMessage" }, update: { value: message }, create: { key: "supportAutoReplyMessage", value: message } }),
        prisma.platformSetting.upsert({ where: { key: "supportAutoReplyByCategory" }, update: { value: JSON.stringify(byCategory) }, create: { key: "supportAutoReplyByCategory", value: JSON.stringify(byCategory) } }),
      ]);
      return NextResponse.json({ autoReply: { enabled: enabled === "true", message, byCategory } });
    }
    return NextResponse.json({ error: "Action administrateur inconnue." }, { status: 400 });
  } catch (error) {
    console.error("[admin/support] update failed", error);
    return NextResponse.json({ error: "La modification n'a pas pu être enregistrée." }, { status: 500 });
  }
}
