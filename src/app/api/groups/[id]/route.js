import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

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

function stripMarkdown(value = "") {
  return String(value)
    .replace(/[#>*_\-\[\]()`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMediaEntry(mediaItem, fallback = {}) {
  if (!mediaItem) return null;

  if (typeof mediaItem === "string") {
    const url = mediaItem.trim();
    if (!url) return null;
    const type = /\.(mp4|webm|mov|m4v|ogg|mp3)$/i.test(url) ? "video" : "image";
    return {
      id: `media_${url}`,
      type,
      url,
      name: fallback.name || (type === "video" ? "Vidéo" : "Image"),
      uploadedBy: fallback.uploadedBy || "Membre",
      initials: fallback.initials || "M",
      time: fallback.time || "",
    };
  }

  const url = mediaItem?.url || mediaItem?.mediaUrl || mediaItem?.src || null;
  if (!url) return null;

  const type = mediaItem?.type || (/\.(mp4|webm|mov|m4v|ogg|mp3)$/i.test(url) ? "video" : "image");
  return {
    ...mediaItem,
    id: mediaItem?.id || mediaItem?.publicId || `${type}_${url}`,
    type,
    url,
    name: mediaItem?.name || mediaItem?.label || (type === "video" ? "Vidéo" : "Image"),
    uploadedBy: mediaItem?.uploadedBy || fallback.uploadedBy || "Membre",
    initials: mediaItem?.initials || fallback.initials || "M",
    time: mediaItem?.time || fallback.time || "",
  };
}

function collectGroupMedia(group, posts = []) {
  const directMedia = normalizeJsonArray(group.media).map((mediaItem) => normalizeMediaEntry(mediaItem)).filter(Boolean);
  const postMedia = posts.flatMap((post) => {
    const mediaList = Array.isArray(post?.media) ? post.media : Array.isArray(post?.images) ? post.images : [];
    return mediaList
      .map((mediaItem) => normalizeMediaEntry(mediaItem, {
        name: post?.headline || post?.title || "Média",
        uploadedBy: post?.author || "Membre",
        initials: post?.initials || "M",
        time: post?.createdAt || "",
      }))
      .filter(Boolean);
  });

  const seen = new Set();
  return [...directMedia, ...postMedia].filter((mediaItem) => {
    const key = `${mediaItem.type}:${mediaItem.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(mediaItem.url);
  });
}

function normalizeLegacyGroupPost(post = {}) {
  const kindFromFlags = Boolean(
    post?.isArticle ||
    post?.type === "article" ||
    post?.kind === "article" ||
    post?.mode === "article" ||
    post?.headline ||
    post?.body ||
    post?.articleBody ||
    post?.excerpt
  );

  const rawBody = typeof post?.body === "string"
    ? post.body
    : typeof post?.articleBody === "string"
      ? post.articleBody
      : typeof post?.text === "string"
        ? post.text
        : "";

  const cleanedBody = rawBody.trim();
  const normalizedHeadline = post?.headline || post?.articleTitle || post?.title || (kindFromFlags ? "Article" : null);
  const excerptSource = typeof post?.excerpt === "string" && post.excerpt.trim() ? post.excerpt : cleanedBody;
  const cleanedExcerpt = stripMarkdown(excerptSource).slice(0, 180) || "";
  
  // Retirer l'excerpt du début du body si elle y est présente (évite les doublons)
  let finalBody = cleanedBody;
  if (cleanedExcerpt && finalBody.length > cleanedExcerpt.length) {
    const bodyNormalized = stripMarkdown(finalBody);
    if (bodyNormalized.startsWith(stripMarkdown(cleanedExcerpt))) {
      finalBody = finalBody.slice(cleanedExcerpt.length).trim();
      if (!finalBody) finalBody = cleanedBody;
    }
  }

  const mediaItems = Array.isArray(post?.media)
    ? post.media
    : Array.isArray(post?.images)
      ? post.images.map((image) => (typeof image === "string" ? { type: "image", url: image } : image))
      : [];
  const inferredCover = post?.coverUrl || post?.image || post?.mediaUrl || (mediaItems.find((mediaItem) => mediaItem?.type === "image" || mediaItem?.url)?.url || null);

  return {
    ...post,
    type: post?.type || (kindFromFlags ? "article" : "post"),
    isArticle: kindFromFlags,
    body: finalBody,
    text: kindFromFlags ? cleanedExcerpt : typeof post?.text === "string" ? post.text : "",
    headline: normalizedHeadline,
    excerpt: cleanedExcerpt,
    coverUrl: inferredCover,
    media: mediaItems,
    images: Array.isArray(post?.images) ? post.images : mediaItems,
    presentation: (() => {
      if (!post?.presentation) return null;
      if (typeof post.presentation === "object") return post.presentation;
      try { return JSON.parse(post.presentation); } catch { return null; }
    })(),
    status: post?.status || "published",
    tags: Array.isArray(post?.tags) ? post.tags : [],
  };
}

async function normalizeGroup(group) {
  const members = normalizeJsonArray(group.members).map((member) => ({
    ...member,
    image: member?.image || member?.avatarUrl || member?.photoUrl || null,
    avatarUrl: member?.avatarUrl || member?.image || member?.photoUrl || null,
    photoUrl: member?.photoUrl || member?.image || member?.avatarUrl || null,
  }));
    const joinRequests = normalizeJsonArray(group.joinRequests);
    const joinQuestions = normalizeJsonArray(group.joinQuestions);
  const rawPosts = normalizeJsonArray(group.posts).map((post) => normalizeLegacyGroupPost(post));
  const authorIds = [...new Set(rawPosts.map((post) => post?.authorId).filter(Boolean))];
  const authors = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } })
    : [];
  const authorById = new Map(authors.map((author) => [author.id, author]));
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const posts = rawPosts.map((post) => {
    const author = authorById.get(post?.authorId);
    const inferredCover = post?.coverUrl || (Array.isArray(post?.media) ? post.media.find((mediaItem) => mediaItem?.type === "image" || mediaItem?.url)?.url || null : null);
    const isArticle = Boolean(post?.isArticle || post?.headline || post?.body || (post?.text && post?.type === "article"));
    const articleBody = typeof post?.body === "string" && post.body.trim() ? post.body : (isArticle ? (typeof post?.text === "string" ? post.text : "") : "");
    const sanitizedArticleExcerpt = typeof post?.excerpt === "string" && post.excerpt.trim()
      ? post.excerpt
      : (isArticle ? stripMarkdown(articleBody).slice(0, 180) || "" : "");

    return {
      ...post,
      isArticle,
      body: articleBody,
      text: isArticle ? sanitizedArticleExcerpt : post?.text || "",
      coverUrl: inferredCover,
      excerpt: sanitizedArticleExcerpt,
      tags: Array.isArray(post?.tags) ? post.tags : [],
      presentation: post?.presentation || null,
      isPlatformAdmin: Boolean(post?.isPlatformAdmin || author?.role === "admin" || (adminEmail && author?.email?.toLowerCase() === adminEmail)),
      isPremium: Boolean(post?.isPremium || (author && hasActiveSubscription(author.subscription))),
    };
  });
    const events = normalizeJsonArray(group.events);
    const media = collectGroupMedia(group, posts);
    const files = normalizeJsonArray(group.files);
    const announcements = normalizeJsonArray(group.announcements);
    const rules = normalizeJsonArray(group.rules);
    const tags = normalizeJsonArray(group.tags);
  
    return {
      id: group.id,
      ownerId: group.ownerId,
      name: group.name,
      emoji: group.emoji || "🌐",
      description: group.description || "",
      category: group.category || "tech",
      coverGradient: group.coverGradient || "linear-gradient(160deg, #1F6F4C 0%, #122318 100%)",
      coverUrl: group.coverUrl || null,
      avatarUrl: group.avatarUrl || null,
      privacy: group.privacy || "public",
      postPermission: group.postPermission || "all",
      location: group.location || null,
      inviteLink: group.inviteLink || `https://lynora.app/g/${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      members,
      joinRequests,
      joinQuestions,
      posts,
      events,
      media,
      files,
      announcements,
      rules,
      tags,
      createdAt: group.createdAt ? group.createdAt.toISOString() : null,
      updatedAt: group.updatedAt ? group.updatedAt.toISOString() : null,
      postsCount: posts.length,
      pendingRequests: joinRequests.length,
      weeklyActive: Math.max(1, members.length),
      engagementRate: Math.min(100, Math.max(0, Math.round((members.length / Math.max(1, members.length + 2)) * 100))),
    };
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const members = normalizeJsonArray(group.members);
  const isOwner = group.ownerId === session.user.id;
  const isMember = members.some((member) => member.id === session.user.id);

  const normalized = await normalizeGroup(group);
  const visiblePosts = normalized.posts.filter((post) => {
    if (post?.status !== "pending_review") return true;
    return isOwner || isMember || post?.authorId === session.user.id;
  });
  return NextResponse.json({
    group: {
      ...normalized,
      ...(isOwner || isMember ? {} : {
        members: [],
        joinRequests: [],
        posts: visiblePosts,
        postsCount: visiblePosts.length,
      }),
    },
  });
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

    const members = normalizeJsonArray(group.members);
    const isMember = group.ownerId === session.user.id || members.some((member) => member.id === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Vous devez être membre de ce groupe" }, { status: 403 });
    }

    const body = await req.json();
    const postUrl = String(body?.url || "").trim();
    if (!postUrl) {
      return NextResponse.json({ error: "Le lien de la publication est requis" }, { status: 400 });
    }

    const authorName = session.user.name || "Utilisateur";
    const sharedPost = {
      id: `shared_${Date.now()}_${session.user.id}`,
      type: "shared-post",
      author: authorName,
      initials: authorName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U",
      authorTitle: "Membre",
      time: new Date().toISOString(),
      text: String(body?.text || "Découvrez cette publication sur LynoraLink."),
      headline: String(body?.title || "Publication partagée"),
      excerpt: String(body?.excerpt || ""),
      isArticle: Boolean(body?.isArticle),
      link: postUrl,
      sharedPostId: String(body?.postId || ""),
      media: Array.isArray(body?.media) ? body.media : [],
      images: Array.isArray(body?.media) ? body.media : [],
      reactions: {},
      comments: [],
      shares: 0,
    };
    const posts = normalizeJsonArray(group.posts);
    const updated = await prisma.group.update({
      where: { id: group.id },
      data: { posts: JSON.stringify([sharedPost, ...posts]) },
    });

    return NextResponse.json({ ok: true, post: sharedPost, group: await normalizeGroup(updated) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const existing = await prisma.group.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const members = normalizeJsonArray(existing.members);
    const isOwner = existing.ownerId === session.user.id;
    const isAdmin = members.some((member) => member.id === session.user.id && ["admin", "moderator"].includes(member.role));
    if (!isOwner && !isAdmin && !members.some((member) => member.id === session.user.id)) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const payload = {};

    if (isOwner || isAdmin) {
      if (typeof body.name === "string") payload.name = body.name.trim();
      if (typeof body.description === "string") payload.description = body.description;
      if (typeof body.category === "string") payload.category = body.category;
      if (typeof body.coverGradient === "string") payload.coverGradient = body.coverGradient;
      if (typeof body.coverUrl === "string") payload.coverUrl = body.coverUrl;
      if (typeof body.avatarUrl === "string") payload.avatarUrl = body.avatarUrl;
      if (typeof body.privacy === "string") payload.privacy = body.privacy;
      if (typeof body.postPermission === "string") payload.postPermission = body.postPermission;
      if (typeof body.location === "string") payload.location = body.location;
      if (typeof body.inviteLink === "string") payload.inviteLink = body.inviteLink;
      if (typeof body.emoji === "string") payload.emoji = body.emoji;
      if (Array.isArray(body.members)) payload.members = JSON.stringify(body.members);
      if (Array.isArray(body.joinRequests)) payload.joinRequests = JSON.stringify(body.joinRequests);
    }
    if (Array.isArray(body.posts)) payload.posts = JSON.stringify(body.posts);
    if (Array.isArray(body.events)) payload.events = JSON.stringify(body.events);
    if (Array.isArray(body.media)) payload.media = JSON.stringify(body.media);
    if (Array.isArray(body.files)) payload.files = JSON.stringify(body.files);
    if (isOwner || isAdmin) {
      if (Array.isArray(body.announcements)) payload.announcements = JSON.stringify(body.announcements);
      if (Array.isArray(body.rules)) payload.rules = JSON.stringify(body.rules);
      if (Array.isArray(body.tags)) payload.tags = JSON.stringify(body.tags);
    }

    const group = await prisma.group.update({
      where: { id: params.id },
      data: payload,
    });

    return NextResponse.json({ ok: true, group: await normalizeGroup(group) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: params.id } });
    if (!group) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }

    const members = normalizeJsonArray(group.members);
    const isOwner = group.ownerId === session.user.id;
    const isAdmin = members.some((member) => member.id === session.user.id && ["admin", "moderator"].includes(member.role));
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    await prisma.group.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, deletedId: params.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
