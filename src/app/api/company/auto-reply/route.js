import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";

const TONES = new Set(["formal", "friendly"]);

async function getPageUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const access = await getSubscriptionAccess(session.user.id);
  if (!access.isPremium) return { forbidden: true };
  const page = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: session.user.id, key: "companyPage" } },
  });
  return page ? { userId: session.user.id } : null;
}

function parseFaq(value) {
  if (!value) return [];
  try {
    const faq = JSON.parse(value);
    return Array.isArray(faq) ? faq.slice(0, 50).map((item) => ({
      question: String(item.question || "").trim().slice(0, 300),
      answer: String(item.answer || "").trim().slice(0, 1000),
    })).filter((item) => item.question && item.answer) : [];
  } catch { return []; }
}

export async function GET() {
  const page = await getPageUser();
  if (!page) return NextResponse.json({ error: "Page entreprise introuvable." }, { status: 404 });
  if (page.forbidden) return NextResponse.json({ error: "Cette fonctionnalite est reservee aux Pages Entreprise Premium." }, { status: 403 });
  const user = await prisma.user.findUnique({ where: { id: page.userId }, select: { autoReplyEnabled: true, autoReplyTone: true, autoReplyDefaultMessage: true, autoReplyFaq: true, autoReplyMedia: true, autoReplyRules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } } });
  return NextResponse.json({ ...user, faq: parseFaq(user?.autoReplyFaq), media: parseMedia(user?.autoReplyMedia) });
}

export async function PUT(request) {
  const page = await getPageUser();
  if (!page) return NextResponse.json({ error: "Page entreprise introuvable." }, { status: 404 });
  if (page.forbidden) return NextResponse.json({ error: "Cette fonctionnalite est reservee aux Pages Entreprise Premium." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const rules = Array.isArray(body.rules) ? body.rules.slice(0, 14).map((rule) => ({
    dayOfWeek: Math.max(0, Math.min(6, Number(rule.dayOfWeek))),
    startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.startTime) ? rule.startTime : "00:00",
    endTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.endTime) ? rule.endTime : "23:59",
    enabled: rule.enabled !== false,
  })) : [];
  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: page.userId }, data: {
      autoReplyEnabled: Boolean(body.autoReplyEnabled),
      autoReplyTone: TONES.has(body.autoReplyTone) ? body.autoReplyTone : "friendly",
      autoReplyDefaultMessage: String(body.autoReplyDefaultMessage || "").trim().slice(0, 1000) || null,
      autoReplyFaq: JSON.stringify(Array.isArray(body.faq) ? body.faq.slice(0, 50).map((item) => ({ question: String(item.question || "").trim().slice(0, 300), answer: String(item.answer || "").trim().slice(0, 1000) })).filter((item) => item.question && item.answer) : []),
      autoReplyMedia: JSON.stringify(Array.isArray(body.media) ? body.media.slice(0, 3).filter((item) => item?.url && ["image", "video", "document"].includes(item.type)).map((item) => ({ url: String(item.url), type: item.type, publicId: item.publicId ? String(item.publicId) : undefined })) : []),
    } });
    await tx.autoReplyRule.deleteMany({ where: { userId: page.userId } });
    if (rules.length) await tx.autoReplyRule.createMany({ data: rules.map((rule) => ({ ...rule, userId: page.userId })) });
    return tx.user.findUnique({ where: { id: page.userId }, select: { autoReplyEnabled: true, autoReplyTone: true, autoReplyDefaultMessage: true, autoReplyFaq: true, autoReplyMedia: true, autoReplyRules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } } });
  });
  return NextResponse.json({ ...updated, faq: parseFaq(updated?.autoReplyFaq), media: parseMedia(updated?.autoReplyMedia) });
}

function parseMedia(value) {
  try {
    const media = JSON.parse(value || "[]");
    return Array.isArray(media) ? media.slice(0, 3).filter((item) => item?.url && ["image", "video", "document"].includes(item.type)) : [];
  } catch { return []; }
}