import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }
    if (group.privacy !== "public") {
      return NextResponse.json({ error: "Ce groupe n'est pas ouvert aux adhésions directes" }, { status: 403 });
    }

    const members = normalizeJsonArray(group.members);
    if (group.ownerId === session.user.id || members.some((member) => member.id === session.user.id)) {
      return NextResponse.json({ ok: true, alreadyMember: true });
    }

    const name = session.user.name || "Vous";
    const member = {
      id: session.user.id,
      name,
      initials: name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "VO",
      image: session.user.image || null,
      avatarUrl: session.user.image || null,
      photoUrl: session.user.image || null,
      online: true,
      role: "member",
      title: "Vous",
      joinedAt: new Date().toISOString(),
      postsCount: 0,
    };
    await prisma.group.update({
      where: { id: group.id },
      data: { members: JSON.stringify([...members, member]) },
    });

    return NextResponse.json({ ok: true, member });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}