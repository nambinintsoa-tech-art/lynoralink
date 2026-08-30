import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "L";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let users;
  try {
    users = await prisma.user.findMany({
      where: {
        OR: [
          { status: { not: "deleted" } },
          { deletedAt: { gte: cutoff } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        image: true,
        location: true,
        role: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
  } catch (error) {
    const message = String(error || "");
    if (!message.includes("deletedAt") && !message.includes("Unknown argument`deletedAt`")) {
      throw error;
    }

    users = await prisma.user.findMany({
      where: {
        status: { not: "deleted" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        image: true,
        location: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
  }

  const shaped = users.map((u) => ({
    id: u.id,
    name: u.name || "Utilisateur",
    email: u.email,
    title: u.title || "Membre LynoraLink",
    initials: initials(u.name),
    image: u.image || null,
    location: u.location || "",
    role: u.role,
    status: u.status,
    deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
    joined: u.createdAt ? u.createdAt.toISOString().split("T")[0] : "",
    lastActive: u.updatedAt ? u.updatedAt.toISOString().split("T")[0] : "",
    posts: u._count.posts,
    connections: 0,
  }));

  return NextResponse.json({ users: shaped });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, role, status } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const validStatuses = ["active", "suspended", "banned", "deleted"];
    const data = {};
    if (role !== undefined && role !== null && role !== "") data.role = role;
    if (status !== undefined && status !== null && status !== "") {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "statut invalide" }, { status: 400 });
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "aucune modification fournie" }, { status: 400 });
    }

    let user;
    try {
      user = await prisma.user.update({
        where: { id },
        data: status === "deleted" ? { ...data, deletedAt: new Date() } : data,
        select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true },
      });
    } catch (updateError) {
      const message = String(updateError || "");
      if (!message.includes("deletedAt") && !message.includes("Unknown argument`deletedAt`")) {
        throw updateError;
      }

      user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, status: true },
      });
    }

    return NextResponse.json({ ok: true, user });
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

    let existing;
    try {
      existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      });
    } catch (lookupError) {
      const message = String(lookupError || "");
      if (!message.includes("deletedAt") && !message.includes("Unknown argument`deletedAt`")) {
        throw lookupError;
      }
      existing = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
    }

    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (existing.deletedAt && existing.deletedAt <= cutoff) {
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ ok: true, finalDelete: true });
    }

    try {
      await prisma.user.update({
        where: { id },
        data: {
          status: "deleted",
          deletedAt: new Date(),
        },
      });
    } catch (deleteError) {
      const message = String(deleteError || "");
      if (!message.includes("deletedAt") && !message.includes("Unknown argument`deletedAt`")) {
        throw deleteError;
      }
      await prisma.user.update({
        where: { id },
        data: { status: "deleted" },
      });
    }

    return NextResponse.json({ ok: true, softDelete: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
