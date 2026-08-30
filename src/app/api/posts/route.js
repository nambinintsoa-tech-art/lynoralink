import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getSubscriptionAccess, hasActiveSubscription } from "@/lib/subscription";
import { getBlockedUserIds } from "@/lib/blocking";
import { broadcastRealtimeEvent } from "@/lib/realtime";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function normalizeMediaPayload(raw, fallbackUrl = null, fallbackType = null) {
  if (Array.isArray(raw) && raw.length) return raw;
  if (raw && typeof raw === "object" && raw.url) return [raw];
  if (fallbackUrl) return [{ type: fallbackType || "image", url: fallbackUrl }];
  return [];
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeVisibility(value) {
  if (value === "Relations" || value === "Réseau" || value === "connections") return "connections";
  if (value === "Privé" || value === "private") return "private";
  return "public";
}

export async function GET(req) {
  const session = await getServerSession(authOptions);

  const searchParams = new URL(req.url).searchParams;
  const requestedUserId = searchParams.get("userId");
  const companyPageId = searchParams.get("companyPageId");
  // Sans userId, le feed doit rester global. Le profil fournit explicitement
  // userId lorsqu'il doit charger les publications d'une personne précise.
  const authorId = requestedUserId || null;
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 50);
  const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  const mediaOnly = searchParams.get("mediaOnly") === "true";
  const sponsoredOnly = searchParams.get("sponsoredOnly") === "true";
  const feedOnly = searchParams.get("feedOnly") === "true";
  const blockedIds = session?.user?.id ? await getBlockedUserIds(prisma, session.user.id) : new Set();
  const feedSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const connectedAuthorIds = session?.user?.id
    ? (await prisma.connection.findMany({
        where: {
          status: "accepted",
          OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
        },
        select: { userAId: true, userBId: true },
      })).map((connection) => connection.userAId === session.user.id ? connection.userBId : connection.userAId)
    : [];
  const visibilityRules = [{ visibility: "public" }];
  if (session?.user?.id) {
    visibilityRules.push(
      { authorId: session.user.id },
      ...(connectedAuthorIds.length ? [{ authorId: { in: connectedAuthorIds }, visibility: "connections" }] : []),
    );
  }
  const where = {
    status: "published",
    ...(!sponsoredOnly && !authorId && !companyPageId ? { isSponsored: false } : {}),
    ...(blockedIds.size ? { NOT: { authorId: { in: [...blockedIds] } } } : {}),
    ...(feedOnly ? { createdAt: { gte: feedSince } } : {}),
    ...(companyPageId ? { companyPageId } : (authorId ? { authorId } : {})),
    ...(mediaOnly ? { OR: [{ mediaUrl: { not: null } }, { mediaData: { not: null } }] } : {}),
    ...(sponsoredOnly ? { isSponsored: true } : {}),
    AND: [{ OR: visibilityRules }],
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      author: { select: { id: true, name: true, title: true, image: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } },
      likes: { select: { userId: true, reaction: true } },
      _count: { select: { savedPosts: true, shares: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          parentId: true,
          text: true,
          mediaData: true,
          createdAt: true,
          reactions: { select: { userId: true, reaction: true } },
          author: { select: { id: true, name: true, image: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } },
        },
      },
    },
  });

  let savedPostIds = new Set();
  if (session?.user?.id && prisma.savedPost?.findMany) {
    try {
      const savedPosts = await prisma.savedPost.findMany({
        where: { userId: session.user.id, postId: { in: posts.map((post) => post.id) } },
        select: { postId: true },
      });
      savedPostIds = new Set(savedPosts.map((savedPost) => savedPost.postId));
    } catch {
      // Le client Prisma peut être obsolète avant prisma generate/migrate deploy.
    }
  }
  const groupByPostId = new Map();
  const groupPostsById = new Map();
  const groups = companyPageId ? [] : await prisma.group.findMany({
    select: { id: true, ownerId: true, name: true, privacy: true, coverUrl: true, coverGradient: true, members: true, posts: true },
  });
  groups.forEach((group) => {
    let groupPosts = [];
    let members = [];
    try { groupPosts = group.posts ? JSON.parse(group.posts) : []; } catch { groupPosts = []; }
    try { members = group.members ? JSON.parse(group.members) : []; } catch { members = []; }
    if (!Array.isArray(groupPosts)) return;
    groupPosts.forEach((groupPost) => {
      if (groupPost?.status && groupPost.status !== "published") return;
      const groupMeta = {
        id: group.id,
        ownerId: group.ownerId,
        privacy: group.privacy || "public",
        memberIds: members.map((member) => member.id).filter(Boolean),
        name: group.name,
        coverUrl: group.coverUrl || null,
        coverGradient: group.coverGradient || null,
        role: (() => {
          const member = members.find((item) =>
            (groupPost.authorId && item.id === groupPost.authorId) ||
            (groupPost.author && groupPost.author !== "Vous" && item.name === groupPost.author)
          );
          return member?.role === "admin" ? "Admin" : member?.role === "moderator" ? "Modérateur" : "Membre";
        })(),
      };
      groupByPostId.set(groupPost.id, groupMeta);
      groupPostsById.set(groupPost.id, { ...groupPost, group: groupMeta });
    });
  });

  const companyPageSettings = new Map();
  const companyPageIds = [...new Set(posts.map((post) => post.companyPageId).filter(Boolean))];
  if (companyPageIds.length) {
    const settings = await prisma.userSetting.findMany({
      where: { key: "companyPage", userId: { in: companyPageIds } },
      select: { userId: true, value: true },
    });
    settings.forEach((setting) => {
      try {
        const page = JSON.parse(setting.value);
        if (page && typeof page === "object") companyPageSettings.set(setting.userId, page);
      } catch {
        // Ignore malformed page settings and keep the creator identity.
      }
    });
  }

  const campaignSettings = new Map();
  const campaignIds = [...new Set(posts.map((post) => post.campaignId).filter(Boolean))];
  if (campaignIds.length) {
    const settings = await prisma.userSetting.findMany({
      where: { key: { in: campaignIds } },
      select: { key: true, value: true },
    });
    settings.forEach((setting) => {
      try {
        const campaign = JSON.parse(setting.value);
        if (campaign && typeof campaign === "object") campaignSettings.set(setting.key, campaign);
      } catch {}
    });
  }

  const shaped = posts.map((p) => {
    let parsedMedia = [];
    try {
      parsedMedia = p.mediaData ? JSON.parse(p.mediaData) : [];
    } catch {
      parsedMedia = [];
    }

    const mediaList = normalizeMediaPayload(parsedMedia, p.mediaUrl, p.mediaType);
    const mediaValue = mediaList.length > 1 ? mediaList : mediaList[0] || null;
    const page = p.companyPageId ? companyPageSettings.get(p.companyPageId) : null;
    const campaign = p.campaignId ? campaignSettings.get(p.campaignId) : null;
    const isSystemAnnouncement = p.presentation === "announcement" || (typeof p.presentation === "string" && p.presentation.includes('"type":"announcement"')) || (p.presentation && typeof p.presentation === "object" && p.presentation.type === "announcement");
    const isPlatformActor = Boolean(p.author.role === "admin" || (process.env.NEXT_PUBLIC_ADMIN_EMAIL && p.author.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase()));
    const displayName = isSystemAnnouncement ? "LynoraLink" : (page?.name || p.author.name);
    const displayImage = isSystemAnnouncement ? "/logo_lynora.svg" : (page?.logoUrl || p.author.image || null);
    const displayTitle = isSystemAnnouncement || isPlatformActor ? "Plateforme" : (page ? "Page entreprise" : (p.author.title || "Membre"));

    const formatComment = (comment) => {
      let parsedCommentMedia = [];
      try {
        parsedCommentMedia = comment.mediaData ? JSON.parse(comment.mediaData) : [];
      } catch {}

      return {
        id: comment.id,
        authorId: comment.author.id,
        author: comment.author.name,
        isPlatformAdmin: comment.author.role === "admin" || Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAIL && comment.author.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase()),
        isPremium: hasActiveSubscription(comment.author.subscription),
        initials: initials(comment.author.name),
        avatarUrl: comment.author.image || null,
        text: comment.text,
        media: parsedCommentMedia,
        time: comment.createdAt,
        likes: 0,
        liked: comment.reactions.some((reaction) => reaction.userId === session?.user?.id),
        reaction: comment.reactions.find((reaction) => reaction.userId === session?.user?.id)?.reaction || null,
        totalReactions: comment.reactions.length,
        replies: (p.comments || []).filter((reply) => reply.parentId === comment.id).map(formatComment),
      };
    };

    return {
      id: p.id,
      authorId: p.authorId,
      companyPageId: p.companyPageId || null,
      author: displayName,
      isPlatformAdmin: p.author.role === "admin" || Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAIL && p.author.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase()),
      isPremium: hasActiveSubscription(p.author.subscription),
      title: displayTitle,
      initials: initials(displayName),
      avatarUrl: displayImage,
      time: p.createdAt,
      likes: p.likes.length,
      reactions: p.likes.reduce((counts, like) => {
        counts[like.reaction || "ok"] = (counts[like.reaction || "ok"] || 0) + 1;
        return counts;
      }, {}),
      reaction: p.likes.find((like) => like.userId === session?.user?.id)?.reaction || null,
      liked: p.likes.some((like) => like.userId === session?.user?.id),
      bookmarked: savedPostIds.has(p.id),
      bookmarks: p._count?.savedPosts || 0,
      shares: p._count?.shares || 0,
      isArticle: p.isArticle,
      text: p.text,
      headline: p.headline,
      excerpt: p.excerpt,
      body: p.body,
      mood: parseJson(p.mood, null),
      identifiedUsers: parseJson(p.identifiedUsers, []),
      visibility: p.visibility,
      isSponsored: p.isSponsored,
      campaignId: p.campaignId || null,
      campaignTitle: campaign?.title || null,
      website: campaign?.website || null,
      whatsapp: campaign?.whatsapp || null,
      cta: campaign?.cta || null,
      presentation: (() => {
        if (p.presentation === "announcement") return { type: "announcement", theme: "navy-gold", density: "airy" };
        try { return p.presentation ? JSON.parse(p.presentation) : null; } catch { return null; }
      })(),
      group: groupByPostId.get(p.id) || null,
      role: groupByPostId.get(p.id)?.role || null,
      media: mediaValue,
      comments: p.comments.filter((comment) => !comment.parentId).map(formatComment),
    };
  });

  const databasePostIds = new Set(shaped.map((post) => post.id));
  const groupOnlyPosts = [...groupPostsById.values()]
    .filter((post) => !databasePostIds.has(post.id))
    .filter((post) => !authorId || String(post.authorId || post.userId || post.group?.ownerId || "") === String(authorId) || String(post.author || "") === String(authorId))
    .filter((post) => !feedOnly || new Date(post.time || post.createdAt || post.event?.createdAt || 0) >= feedSince)
    .map((post) => ({
      id: post.id,
      authorId: post.authorId || null,
      author: post.author || post.event?.createdByName || "Utilisateur",
      title: post.title || post.authorTitle || "Membre",
      initials: post.initials || initials(post.author || post.event?.createdByName || "Utilisateur"),
      avatarUrl: post.avatarUrl || post.event?.createdByAvatar || null,
      time: post.time || post.createdAt || post.event?.createdAt || new Date(0).toISOString(),
      likes: Number(post.likes || 0),
      reactions: post.reactions || {},
      reaction: post.reaction || null,
      liked: Boolean(post.liked),
      bookmarked: Boolean(post.bookmarked),
      shares: Number(post.shares || 0),
      isArticle: Boolean(post.isArticle),
      isEvent: Boolean(post.isEvent || post.type === "event" || post.event),
      type: post.type || null,
      event: post.event || null,
      isFile: Boolean(post.isFile || post.type === "file" || post.type === "document" || post.file),
      file: post.file || post.attachment || null,
      text: post.text || "",
      headline: post.headline || null,
      excerpt: post.excerpt || null,
      body: post.body || null,
      visibility: post.visibility || "public",
      media: post.media || post.images || [],
      comments: Array.isArray(post.comments) ? post.comments : [],
      group: post.group,
      role: post.role || post.group?.role || null,
    }));

  return NextResponse.json({
    posts: [...shaped, ...groupOnlyPosts].sort((first, second) => new Date(second.time) - new Date(first.time)),
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { text, isArticle, headline, excerpt, articleBody, media, presentation, mood, identifiedUsers, visibility, companyPageId, isSponsored } = body;
  const mediaList = Array.isArray(media) ? media : media ? [media] : [];
  const mediaItem = mediaList[0] || null;
  const hasText = typeof text === "string" && text.trim().length > 0;
  const hasArticleBody = typeof articleBody === "string" && articleBody.trim().length > 0;
  const hasMedia = Boolean(mediaItem?.url);

  if (!isArticle && !hasText && !hasMedia) {
    return NextResponse.json({ error: "Le contenu est vide." }, { status: 400 });
  }

  if (isArticle && !headline?.trim() && !hasText && !hasArticleBody) {
    return NextResponse.json({ error: "L'article doit contenir un titre ou du contenu." }, { status: 400 });
  }

  const serializedMedia = mediaList.length ? JSON.stringify(mediaList) : null;
  const pageSetting = companyPageId && companyPageId === session.user.id
    ? await prisma.userSetting.findUnique({ where: { userId_key: { userId: session.user.id, key: "companyPage" } } })
    : null;
  const targetCompanyPageId = pageSetting ? companyPageId : null;
  if (isSponsored === true && !targetCompanyPageId) {
    return NextResponse.json({ error: "Une publicité doit être publiée depuis une page entreprise." }, { status: 403 });
  }
  if (isSponsored === true && !(await getSubscriptionAccess(session.user.id)).isPremium) {
    return NextResponse.json({ error: "Acces reserve aux pages entreprise Premium" }, { status: 403 });
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      companyPageId: targetCompanyPageId,
      text: text || null,
      isArticle: !!isArticle,
      headline: headline || null,
      excerpt: excerpt || null,
      body: articleBody || null,
      presentation: isArticle && presentation ? JSON.stringify(presentation) : null,
      mediaUrl: mediaItem?.url || null,
      mediaType: mediaItem?.type || null,
      mediaData: serializedMedia,
      mood: mood && typeof mood === "object" ? JSON.stringify({ emoji: mood.emoji, label: mood.label }) : null,
      identifiedUsers: Array.isArray(identifiedUsers)
        ? JSON.stringify(identifiedUsers.slice(0, 20).map((user) => ({
            id: user?.id,
            name: user?.name,
            title: user?.title || null,
            image: user?.image || user?.avatarUrl || null,
          })).filter((user) => user.id && user.name))
        : null,
      visibility: normalizeVisibility(visibility),
      isSponsored: isSponsored === true && Boolean(targetCompanyPageId),
    },
  });

  if (Array.isArray(identifiedUsers)) {
    await Promise.all(identifiedUsers.slice(0, 20).map((identifiedUser) => createNotification({
      userId: identifiedUser?.id,
      senderId: session.user.id,
      type: "mention",
      actor: session.user.name || "Un utilisateur",
      text: "vous a identifié dans une publication.",
      meta: { postId: post.id },
    })));
  }

  broadcastRealtimeEvent({ userId: session.user.id, type: "posts", payload: { postId: post.id, action: "created" } });
  return NextResponse.json({ post }, { status: 201 });
}
