import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGroq } from "@/lib/groq";

const FALLBACK_ANNOUNCEMENT = "LynoraLink continue d'améliorer votre expérience professionnelle. Retrouvez les dernières nouveautés et échangez avec votre réseau dès maintenant.";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, email: true } });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  return user?.role === "admin" || (adminEmail && user.email?.toLowerCase() === adminEmail) ? user : null;
}

async function generateAnnouncement() {
  try {
    const response = await callGroq([
      { role: "system", content: "Tu es l'assistant éditorial officiel de LynoraLink. Rédige une annonce professionnelle en français, positive et concise, de 2 à 4 phrases. N'invente aucune fonctionnalité précise, aucun chiffre et aucune date. Retourne uniquement le texte, sans titre, Markdown ni hashtags." },
      { role: "user", content: "Rédige une annonce générale pour informer la communauté d'une mise à jour de la plateforme et encourager les membres à découvrir leur fil et leur réseau." },
    ], { temperature: 0.4, max_tokens: 220 });
    const text = String(response || "").trim().replace(/^```[\s\S]*?```$/g, "").trim();
    if (text.length >= 20 && text.length <= 2000) return { text, source: "ai" };
  } catch (error) {
    console.warn("[admin/ai/announcement] provider unavailable:", error.message);
  }
  return { text: FALLBACK_ANNOUNCEMENT, source: "fallback" };
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });

  try {
    const announcement = await generateAnnouncement();
    const post = await prisma.post.create({
      data: {
        authorId: admin.id,
        text: announcement.text,
        status: "published",
        visibility: "public",
        isSponsored: false,
        presentation: JSON.stringify({ type: "announcement", theme: "navy-gold", density: "airy", source: announcement.source, actor: "LynoraLink", avatarUrl: "/logo_lynora.svg" }),
      },
      select: { id: true, text: true, status: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, post, source: announcement.source });
  } catch (error) {
    console.error("[admin/ai/announcement] creation failed", error);
    return NextResponse.json({ error: "L'annonce n'a pas pu être créée." }, { status: 500 });
  }
}
