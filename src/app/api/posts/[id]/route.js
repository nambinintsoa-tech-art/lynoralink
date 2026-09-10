import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeVisibility(value) {
  if (value === "Relations" || value === "Réseau" || value === "connections") return "connections";
  if (value === "Privé" || value === "private") return "private";
  return "public";
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const id = params?.id;
  const body = await req.json().catch(() => ({}));
  const hasText = Object.prototype.hasOwnProperty.call(body, "text");
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const hasVisibility = Object.prototype.hasOwnProperty.call(body, "visibility");
  const hasMedia = Object.prototype.hasOwnProperty.call(body, "media");
  const hasCommentsSettings = Object.prototype.hasOwnProperty.call(body, "commentsLocked") || Object.prototype.hasOwnProperty.call(body, "commentatorsLimit");
  const media = Array.isArray(body.media) ? body.media.slice(0, 20).filter((item) => item?.url) : [];
  const normalizedCommentatorsLimit = Number.isFinite(Number(body.commentatorsLimit)) && Number(body.commentatorsLimit) >= 0
    ? Math.max(0, Math.min(1000, Math.floor(Number(body.commentatorsLimit))))
    : 0;
  if (!id || (!hasText && !hasVisibility && !hasMedia && !hasCommentsSettings)) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour." }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez modifier que vos publications." }, { status: 403 });
  }

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      ...(hasText ? { text } : {}),
      ...(hasVisibility ? { visibility: normalizeVisibility(body.visibility) } : {}),
      ...(hasMedia ? {
        mediaData: media.length ? JSON.stringify(media) : null,
        mediaUrl: media[0]?.url || null,
        mediaType: media[0]?.type || null,
      } : {}),
      ...(hasCommentsSettings ? {
        commentsLocked: Boolean(body.commentsLocked),
        commentatorsLimit: normalizedCommentatorsLimit,
      } : {}),
    },
    select: { id: true, text: true, visibility: true, updatedAt: true, mediaUrl: true, mediaType: true, mediaData: true, commentsLocked: true, commentatorsLimit: true },
  });

  return NextResponse.json({ post: { ...updatedPost, ...(hasMedia ? { media } : {}) } });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const id = params?.id;
  const body = await req.json().catch(() => ({}));
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : "";
  if (!id || !mediaUrl) return NextResponse.json({ error: "Média invalide" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true, mediaUrl: true, mediaData: true } });
  if (!post) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (post.authorId !== session.user.id) return NextResponse.json({ error: "Vous ne pouvez modifier que vos publications." }, { status: 403 });

  let media = [];
  try { media = post.mediaData ? JSON.parse(post.mediaData) : []; } catch { media = []; }
  const nextMedia = Array.isArray(media) ? media.filter((item) => item?.url !== mediaUrl) : [];
  const nextMediaUrl = nextMedia[0]?.url || null;
  await prisma.post.update({ where: { id }, data: { mediaData: nextMedia.length ? JSON.stringify(nextMedia) : null, mediaUrl: nextMediaUrl, mediaType: nextMedia.length ? nextMedia[0]?.type || null : null } });
  return NextResponse.json({ ok: true, postId: id, mediaUrl });
}
