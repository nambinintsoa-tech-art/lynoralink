import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Le filtrage textuel des posts seed était trop large et supprimait les vrais contenus.
// On se limite aux posts publiés tant qu'un vrai flag de seed n'est pas ajouté au modèle.

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "L";
}

function normalizeMediaPayload(raw, fallbackUrl = null, fallbackType = null) {
  if (Array.isArray(raw) && raw.length) return raw;
  if (raw && typeof raw === "object" && raw.url) return [raw];
  if (fallbackUrl) return [{ type: fallbackType || "image", url: fallbackUrl, label: fallbackType === "video" ? "Vidéo" : "Image" }];
  return [];
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Vérifier que l'utilisateur est admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });

  const isAdmin = user?.role === "admin" || 
    (user?.email && user.email.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase());

  if (!isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const posts = await prisma.post.findMany({
    where: {
      status: { in: ["published", "pending_review", "rejected"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, title: true, image: true, email: true } },
      likes: { select: { id: true } },
      comments: { select: { id: true } },
    },
  });
  const [companyPageSettings, groups] = await Promise.all([
    prisma.userSetting.findMany({ where: { key: "companyPage" }, select: { userId: true, value: true } }),
    prisma.group.findMany({ select: { id: true, name: true, emoji: true, avatarUrl: true, posts: true, createdAt: true } }),
  ]);
  const companyPages = new Map();
  companyPageSettings.forEach((setting) => {
    try {
      const page = JSON.parse(setting.value);
      if (page && typeof page === "object") companyPages.set(setting.userId, page);
    } catch {}
  });

  const shaped = posts.map((p) => {
    let parsedMedia = [];
    try {
      parsedMedia = p.mediaData ? JSON.parse(p.mediaData) : [];
    } catch {
      parsedMedia = [];
    }

    const mediaList = normalizeMediaPayload(parsedMedia, p.mediaUrl, p.mediaType);
    const firstMedia = mediaList[0] || null;

    return {
      id: p.id,
      author: companyPages.get(p.companyPageId)?.name || p.author?.name || "Utilisateur",
      authorId: p.authorId,
      title: p.author?.title || "",
      initials: initials(p.author?.name),
      avatarUrl: companyPages.get(p.companyPageId)?.logoUrl || companyPages.get(p.companyPageId)?.avatarUrl || p.author?.image || null,
      time: p.createdAt,
      likes: p.likes?.length || 0,
      comments: p.comments?.length || 0,
      shares: 0,
      isArticle: p.isArticle,
      text: p.text || p.body || "",
      headline: p.headline || "",
      excerpt: p.excerpt || "",
      body: p.body || "",
      status: p.status,
      reported: p.reported,
      featured: p.featured,
      media: mediaList.length > 1 ? mediaList : firstMedia,
      mediaUrl: firstMedia?.url || p.mediaUrl || null,
      mediaType: firstMedia?.type || p.mediaType || null,
      companyPage: p.companyPageId ? {
        id: p.companyPageId,
        name: companyPages.get(p.companyPageId)?.name || "Page entreprise",
        logoUrl: companyPages.get(p.companyPageId)?.logoUrl || companyPages.get(p.companyPageId)?.avatarUrl || null,
      } : null,
      group: null,
    };
  });

  const groupPosts = groups.flatMap((group) => normalizeJsonArray(group.posts).map((post, index) => {
    const text = post?.text || post?.body || post?.content || "";
    const mediaList = normalizeMediaPayload(post?.media || post?.mediaData, post?.mediaUrl, post?.mediaType);
    const firstMedia = mediaList[0] || null;
    const resolvedAuthorName = post?.author || post?.authorName || group.name;
    const resolvedInitials = post?.initials || (post?.author || post?.authorName ? initials(post?.author || post?.authorName) : (group.emoji || initials(group.name)));
    const status = post?.status || "published";
    return {
      id: post?.id || `group-${group.id}-${index}`,
      author: resolvedAuthorName,
      authorId: post?.authorId || group.ownerId || null,
      title: "Publication de groupe",
      initials: resolvedInitials,
      avatarUrl: post?.avatarUrl || post?.authorAvatar || post?.image || group.avatarUrl || null,
      time: post?.createdAt || group.createdAt,
      likes: Number(post?.likes || 0),
      comments: Number(post?.comments || 0),
      shares: Number(post?.shares || 0),
      isArticle: Boolean(post?.isArticle),
      text,
      headline: post?.headline || "",
      excerpt: post?.excerpt || "",
      body: post?.body || text,
      status,
      reported: Boolean(post?.reported),
      featured: Boolean(post?.featured),
      media: mediaList.length > 1 ? mediaList : firstMedia,
      mediaUrl: firstMedia?.url || null,
      mediaType: firstMedia?.type || null,
      companyPage: null,
      group: { id: group.id, name: group.name, emoji: group.emoji || "🌐" },
    };
  }));

  return NextResponse.json({ posts: [...shaped, ...groupPosts].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)) });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, reported, featured } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data = {};
    if (status !== undefined) data.status = status;
    if (reported !== undefined) data.reported = reported;
    if (featured !== undefined) data.featured = featured;

    const post = await prisma.post.update({
      where: { id },
      data,
      include: { author: { select: { name: true, title: true, image: true } } },
    });

    return NextResponse.json({ ok: true, post });
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

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
