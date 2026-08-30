import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
  });

  const shaped = groups.map((g) => {
    let members = [];
    let posts = [];
    try {
      members = typeof g.members === "string" ? JSON.parse(g.members || "[]") : Array.isArray(g.members) ? g.members : [];
      posts = typeof g.posts === "string" ? JSON.parse(g.posts || "[]") : Array.isArray(g.posts) ? g.posts : [];
    } catch {
      // ignore parse errors
    }

    return {
      id: g.id,
      name: g.name,
      initials: (g.emoji || "🌐"),
      coverUrl: g.coverUrl || null,
      coverGradient: g.coverGradient || null,
      category: g.category || "tech",
      privacy: g.privacy || "public",
      createdAt: g.createdAt ? g.createdAt.toISOString().split("T")[0] : "",
      status: g.status,
      members: members.length,
      postsCount: posts.length,
      reportsCount: 0,
      ownerId: g.ownerId,
    };
  });

  return NextResponse.json({ groups: shaped });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data = {};
    if (status !== undefined) data.status = status;

    const group = await prisma.group.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, group });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
