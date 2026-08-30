import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeFileName(name = "fichier") {
  return name.replace(/[\\"\r\n]/g, "_").trim() || "fichier";
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const members = normalizeJsonArray(group.members);
  const isMember = group.ownerId === session.user.id || members.some((member) => member.id === session.user.id);
  if (!isMember && group.privacy !== "public") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const file = normalizeJsonArray(group.files).find((item) => item.id === params.fileId);
  if (!file?.url) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });

  try {
    const response = await fetch(file.url);
    if (!response.ok) return NextResponse.json({ error: "Le fichier n’est plus disponible" }, { status: 502 });

    const updatedFiles = normalizeJsonArray(group.files).map((item) =>
      item.id === file.id ? { ...item, downloads: (item.downloads || 0) + 1 } : item
    );
    await prisma.group.update({ where: { id: group.id }, data: { files: JSON.stringify(updatedFiles) } });

    const contentType = file.mimeType || response.headers.get("content-type") || "application/octet-stream";
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName(file.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de télécharger le fichier" }, { status: 502 });
  }
}
