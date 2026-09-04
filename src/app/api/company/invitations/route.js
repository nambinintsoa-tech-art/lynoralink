import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVITATIONS_KEY = "companyPageInvitations";
const FOLLOWED_PAGES_KEY = "followedCompanyPages";

function parseArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, image: true } });
}

async function readSetting(userId, key) {
  return prisma.userSetting.findUnique({ where: { userId_key: { userId, key } } });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const setting = await readSetting(user.id, INVITATIONS_KEY);
  const invitations = parseArray(setting?.value).filter((invitation) => invitation?.status === "pending");
  return NextResponse.json({ invitations });
}

export async function POST(request) {
  const sender = await getSessionUser();
  if (!sender) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const targetUserId = String(body?.targetUserId || "").trim();
  if (!targetUserId || targetUserId === sender.id) {
    return NextResponse.json({ error: "Destinataire invalide" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const pageSetting = await readSetting(sender.id, "companyPage");
  const page = pageSetting ? (() => { try { return JSON.parse(pageSetting.value); } catch { return null; } })() : null;
  if (!page || typeof page !== "object") {
    return NextResponse.json({ error: "Aucune page entreprise à partager" }, { status: 400 });
  }

  const recipientSetting = await readSetting(targetUserId, INVITATIONS_KEY);
  const invitations = parseArray(recipientSetting?.value);
  const existing = invitations.find((invitation) => invitation.pageId === sender.id && invitation.status === "pending");
  if (existing) return NextResponse.json({ error: "Une invitation est déjà en attente" }, { status: 409 });

  const invitation = {
    id: crypto.randomUUID(),
    pageId: sender.id,
    pageName: page.name || "Page entreprise",
    pageImage: page.logoUrl || page.avatarUrl || null,
    inviterId: sender.id,
    inviterName: sender.name || "Une entreprise",
    inviterImage: sender.image || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const nextInvitations = [invitation, ...invitations.filter((item) => item?.status !== "pending" || item.pageId !== sender.id)];

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: targetUserId, key: INVITATIONS_KEY } },
    create: { userId: targetUserId, key: INVITATIONS_KEY, value: JSON.stringify(nextInvitations) },
    update: { value: JSON.stringify(nextInvitations) },
  });

  return NextResponse.json({ ok: true, invitation }, { status: 201 });
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const invitationId = String(body?.id || "").trim();
  const action = String(body?.action || "").trim();
  if (!invitationId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const setting = await readSetting(user.id, INVITATIONS_KEY);
  const invitations = parseArray(setting?.value);
  const invitation = invitations.find((item) => item?.id === invitationId && item.status === "pending");
  if (!invitation) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });

  const remaining = invitations.filter((item) => item.id !== invitationId);
  await prisma.userSetting.upsert({
    where: { userId_key: { userId: user.id, key: INVITATIONS_KEY } },
    create: { userId: user.id, key: INVITATIONS_KEY, value: JSON.stringify(remaining) },
    update: { value: JSON.stringify(remaining) },
  });

  if (action === "accept") {
    const followedSetting = await readSetting(user.id, FOLLOWED_PAGES_KEY);
    const followedPages = parseArray(followedSetting?.value);
    const nextFollowedPages = followedPages.includes(invitation.pageId) ? followedPages : [...followedPages, invitation.pageId];
    await prisma.userSetting.upsert({
      where: { userId_key: { userId: user.id, key: FOLLOWED_PAGES_KEY } },
      create: { userId: user.id, key: FOLLOWED_PAGES_KEY, value: JSON.stringify(nextFollowedPages) },
      update: { value: JSON.stringify(nextFollowedPages) },
    });
  }

  return NextResponse.json({ ok: true, accepted: action === "accept", invitation });
}
