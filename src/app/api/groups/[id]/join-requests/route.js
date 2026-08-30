import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

function normalizeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getMember(group, userId) {
  return normalizeJsonArray(group.members).find((member) => member?.id === userId);
}

function isAdmin(group, userId) {
  return group.ownerId === userId || ["admin", "moderator"].includes(getMember(group, userId)?.role);
}

function getAdminUserIds(group) {
  const members = normalizeJsonArray(group.members);
  const ids = new Set();
  if (group.ownerId) ids.add(group.ownerId);
  members.forEach((member) => {
    if (member?.id && ["admin", "moderator"].includes(member?.role)) ids.add(member.id);
  });
  return [...ids];
}

const DEFAULT_JOIN_QUESTIONS = [
  { id: "rules", label: "Acceptez-vous de respecter les règles du groupe ?" },
  { id: "participation", label: "Souhaitez-vous participer régulièrement aux échanges ?" },
  { id: "relevance", label: "Votre intérêt correspond-il au thème de ce groupe ?" },
];

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    if (group.privacy !== "private") return NextResponse.json({ error: "Ce groupe accepte les adhésions directes" }, { status: 400 });

    const members = normalizeJsonArray(group.members);
    const requests = normalizeJsonArray(group.joinRequests);
    if (group.ownerId === session.user.id || members.some((member) => member?.id === session.user.id)) {
      return NextResponse.json({ error: "Vous êtes déjà membre de ce groupe" }, { status: 409 });
    }
    if (requests.some((request) => request?.userId === session.user.id && (request.status || "pending") === "pending")) {
      return NextResponse.json({ error: "Votre demande est déjà en attente" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const configuredQuestions = normalizeJsonArray(group.joinQuestions).filter((question) => question?.id && question?.label) || DEFAULT_JOIN_QUESTIONS;
    const questions = configuredQuestions.length > 0 ? configuredQuestions : DEFAULT_JOIN_QUESTIONS;
    const answers = body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ error: "Répondez à toutes les questions" }, { status: 400 });
    }
    const normalizedAnswers = Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, value === true ? true : value === false ? false : null]));
    if (questions.some((question) => typeof normalizedAnswers[question.id] !== "boolean") || Object.keys(normalizedAnswers).length !== questions.length) {
      return NextResponse.json({ error: "Répondez à toutes les questions par oui ou non" }, { status: 400 });
    }

    const name = session.user.name || "Utilisateur";
    const request = {
      id: `join_${Date.now()}_${session.user.id}`,
      userId: session.user.id,
      name,
      initials: name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U",
      title: session.user.title || "Membre LynoraLink",
      image: session.user.image || null,
      avatarUrl: session.user.image || null,
      answers: normalizedAnswers,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };
    const updated = await prisma.group.update({
      where: { id: group.id },
      data: { joinRequests: JSON.stringify([request, ...requests.filter((item) => item?.userId !== session.user.id)]) },
    });

    const adminIds = getAdminUserIds(group).filter((id) => id && id !== session.user.id);
    await Promise.all(adminIds.map((adminId) => createNotification({
      userId: adminId,
      senderId: session.user.id,
      type: "group_join_request",
      actor: name,
      text: `${name} souhaite rejoindre le groupe ${group.name}.`,
      avatarUrl: session.user.image || null,
      coverUrl: group.coverUrl || group.avatarUrl || null,
      meta: { groupId: group.id, kind: "group_join_request", groupName: group.name, avatarUrl: session.user.image || null, coverUrl: group.coverUrl || group.avatarUrl || null },
    })));
    return NextResponse.json({ ok: true, request, joinRequests: normalizeJsonArray(updated.joinRequests) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    if (!isAdmin(group, session.user.id)) return NextResponse.json({ error: "Accès interdit" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.requestId || "");
    const decision = body?.decision;
    if (!requestId || !["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "Décision invalide" }, { status: 400 });

    const members = normalizeJsonArray(group.members);
    const requests = normalizeJsonArray(group.joinRequests);
    const request = requests.find((item) => item?.id === requestId);
    if (!request) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

    const remaining = requests.filter((item) => item?.id !== requestId);
    const nextMembers = decision === "approved" && !members.some((member) => member?.id === request.userId)
      ? [...members, { id: request.userId, name: request.name, initials: request.initials, image: request.image || request.avatarUrl || null, avatarUrl: request.avatarUrl || request.image || null, online: false, role: "member", title: request.title || "Membre", joinedAt: new Date().toISOString(), postsCount: 0 }]
      : members;
    const updated = await prisma.group.update({ where: { id: group.id, }, data: { members: JSON.stringify(nextMembers), joinRequests: JSON.stringify(remaining) } });
    const decisionText = decision === "approved"
      ? `Votre demande pour rejoindre ${group.name} a été approuvée.`
      : `Votre demande pour rejoindre ${group.name} a été refusée.`;
    await createNotification({ userId: request.userId, senderId: session.user.id, type: decision === "approved" ? "group_join_approved" : "group_join_rejected", actor: group.name, text: decisionText, meta: { groupId: group.id, kind: decision === "approved" ? "group_join_approved" : "group_join_rejected" } });
    return NextResponse.json({ ok: true, decision, group: { ...updated, members: nextMembers, joinRequests: remaining } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
