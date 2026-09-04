import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function parseMedia(value, fallbackUrl, fallbackType) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return fallbackUrl ? [{ type: fallbackType || "image", url: fallbackUrl }] : [];
}

function authError(reply) {
  return reply.code(401).send({ error: "Non authentifié" });
}

async function findPost(id, reply) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) reply.code(404).send({ error: "Publication introuvable" });
  return post;
}

async function canManagePost(post, userId) {
  if (post.authorId === userId) return true;
  if (!post.companyPageId) return false;
  const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: post.companyPageId, key: "companyPage" } } });
  return Boolean(setting && post.companyPageId === userId);
}

function shapeComment(comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    authorId: comment.authorId,
    author: comment.author?.name || "Utilisateur",
    initials: initials(comment.author?.name || "Utilisateur"),
    avatarUrl: comment.author?.image || null,
    text: comment.text,
    media: parseMedia(comment.mediaData),
    mediaData: comment.mediaData,
    time: comment.createdAt,
    createdAt: comment.createdAt,
    likes: comment.reactions?.length || 0,
    liked: false,
    replies: comment.replies?.map(shapeComment) || [],
  };
}

export async function registerPostRoutes(app) {
  app.get("/v1/posts", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const query = request.query || {};
    const limit = Math.min(Math.max(Number.parseInt(query.limit || "50", 10) || 50, 1), 50);
    const offset = Math.max(Number.parseInt(query.offset || "0", 10) || 0, 0);
    const feedSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const connectedAuthors = userId
      ? await prisma.connection.findMany({
          where: {
            status: "accepted",
            OR: [{ userAId: userId }, { userBId: userId }],
          },
          select: { userAId: true, userBId: true },
        })
      : [];
    const connectedAuthorIds = connectedAuthors.map((connection) =>
      connection.userAId === userId ? connection.userBId : connection.userAId,
    );
    const visibilityRules = [{ visibility: "public" }];
    if (userId) {
      visibilityRules.push({ authorId: userId });
      if (connectedAuthorIds.length) {
        visibilityRules.push({ authorId: { in: connectedAuthorIds }, visibility: "connections" });
      }
    }

    const posts = await prisma.post.findMany({
      where: {
        status: "published",
        ...(!query.companyPageId ? { isSponsored: false } : {}),
        ...(query.userId ? { authorId: String(query.userId) } : {}),
        ...(query.companyPageId ? { companyPageId: String(query.companyPageId) } : {}),
        ...(query.mediaOnly === "true" ? { mediaData: { not: null } } : {}),
        ...(query.feedOnly === "true" ? { createdAt: { gte: feedSince } } : {}),
        AND: [{ OR: visibilityRules }],
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        author: { select: { id: true, name: true, title: true, image: true, role: true, email: true } },
        likes: { select: { userId: true, reaction: true } },
        _count: { select: { savedPosts: true, shares: true } },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, image: true } }, replies: { include: { author: { select: { id: true, name: true, image: true } } } } },
        },
      },
    });

    const saved = userId
      ? await prisma.savedPost.findMany({ where: { userId, postId: { in: posts.map((post) => post.id) } }, select: { postId: true } })
      : [];
    const savedIds = new Set(saved.map((item) => item.postId));
    const campaignIds = [...new Set(posts.map((post) => post.campaignId).filter(Boolean))];
    const campaignRows = campaignIds.length
      ? await prisma.userSetting.findMany({ where: { key: { in: campaignIds } }, select: { key: true, value: true } })
      : [];
    const campaigns = new Map(campaignRows.map((row) => {
      try { return [row.key, JSON.parse(row.value || "{}")] ; } catch { return [row.key, {}]; }
    }));
    const pageIds = [...new Set(posts.map((post) => post.companyPageId).filter(Boolean))];
    const pageRows = pageIds.length
      ? await prisma.userSetting.findMany({ where: { userId: { in: pageIds }, key: "companyPage" }, select: { userId: true, value: true } })
      : [];
    const pages = new Map(pageRows.map((row) => {
      try { return [row.userId, JSON.parse(row.value || "{}")] ; } catch { return [row.userId, {}]; }
    }));

    return reply.send({
      posts: posts.map((post) => {
        const media = parseMedia(post.mediaData, post.mediaUrl, post.mediaType);
        const currentReaction = post.likes.find((like) => like.userId === userId);
        const campaign = campaigns.get(post.campaignId) || {};
        const page = pages.get(post.companyPageId) || {};
        const displayName = page.name || post.author.name;
        const displayImage = page.logoUrl || page.avatarUrl || post.author.image || null;
        return {
          id: post.id,
          authorId: post.authorId,
          companyPageId: post.companyPageId || null,
          authorType: page.name ? "page" : "person",
          author: displayName,
          title: page.name ? "Page entreprise" : (post.author.title || "Membre"),
          role: post.author.role || null,
          initials: initials(displayName),
          avatarUrl: displayImage,
          pageCoverUrl: page.bannerUrl || page.coverUrl || null,
          description: page.description || null,
          location: page.location || null,
          pageWebsite: page.website || null,
          followersCount: page.stats?.followers ?? page.followers ?? null,
          isSponsored: Boolean(post.isSponsored || post.campaignId),
          campaignId: post.campaignId || null,
          campaignTitle: campaign.title || null,
          campaignDescription: campaign.description || null,
          objective: campaign.objective || null,
          website: campaign.website || null,
          whatsapp: campaign.whatsapp || null,
          cta: campaign.cta || "En savoir plus",
          isPlatformAdmin: post.author.role === "admin" || (post.author.email && [process.env.ADMIN_EMAIL, process.env.NEXT_PUBLIC_ADMIN_EMAIL].filter(Boolean).some((email) => post.author.email.toLowerCase() === email.toLowerCase())),
          time: post.createdAt,
          likes: post.likes.length,
          reaction: currentReaction?.reaction || null,
          reactions: post.likes.reduce((counts, like) => ({ ...counts, [like.reaction || "ok"]: (counts[like.reaction || "ok"] || 0) + 1 }), {}),
          liked: Boolean(currentReaction),
          bookmarked: savedIds.has(post.id),
          bookmarks: post._count?.savedPosts || 0,
          shares: post._count?.shares || 0,
          isArticle: post.isArticle,
          presentation: (() => { try { return post.presentation ? JSON.parse(post.presentation) : {}; } catch { return {}; } })(),
          text: post.text,
          headline: post.headline,
          excerpt: post.excerpt,
          body: post.body,
          media: media.length > 1 ? media : media[0] || null,
          comments: post.comments.map((comment) => {
            const isPageComment = Boolean(page.name && String(comment.author.id) === String(post.companyPageId));
            const commentAuthor = isPageComment ? page.name : comment.author.name;
            return {
            id: comment.id,
            authorId: comment.author.id,
            authorType: isPageComment ? "page" : "person",
            companyPageId: isPageComment ? post.companyPageId : null,
            author: commentAuthor,
            initials: initials(commentAuthor),
            avatarUrl: isPageComment ? (page.logoUrl || page.avatarUrl || null) : comment.author.image || null,
            coverUrl: isPageComment ? (page.bannerUrl || page.coverUrl || null) : null,
            text: comment.text,
            time: comment.createdAt,
            likes: 0,
            liked: false,
            replies: (comment.replies || []).map((reply) => {
              const isPageReply = Boolean(page.name && String(reply.author.id) === String(post.companyPageId));
              const replyAuthor = isPageReply ? page.name : reply.author.name;
              return { id: reply.id, authorId: reply.author.id, authorType: isPageReply ? "page" : "person", companyPageId: isPageReply ? post.companyPageId : null, author: replyAuthor, initials: initials(replyAuthor), avatarUrl: isPageReply ? (page.logoUrl || page.avatarUrl || null) : reply.author.image || null, coverUrl: isPageReply ? (page.bannerUrl || page.coverUrl || null) : null, text: reply.text, time: reply.createdAt, likes: 0, liked: false };
            }),
          };
          }),
        };
      }),
      pagination: { limit, offset, hasMore: posts.length === limit },
    });
  });

  app.post("/v1/posts", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const body = request.body || {};
    const text = body.isArticle ? null : String(body.text || "").trim();
    const articleBody = body.isArticle ? String(body.articleBody || body.body || "").trim() : null;
    if (!text && !articleBody && (!Array.isArray(body.media) || body.media.length === 0)) return reply.code(400).send({ error: "Le contenu de la publication est requis" });
    const companyPageId = body.companyPageId ? String(body.companyPageId) : null;
    if (companyPageId && companyPageId !== userId) return reply.code(403).send({ error: "Vous ne pouvez pas publier pour cette page" });
    const media = Array.isArray(body.media) ? body.media.slice(0, 20) : [];
    const post = await prisma.post.create({
      data: {
        authorId: userId,
        companyPageId,
        text,
        isSponsored: Boolean(body.isSponsored),
        isArticle: Boolean(body.isArticle),
        headline: body.headline ? String(body.headline).trim().slice(0, 200) : null,
        excerpt: body.excerpt ? String(body.excerpt).trim().slice(0, 500) : null,
        body: articleBody,
        presentation: body.presentation ? JSON.stringify(body.presentation) : null,
        mediaData: JSON.stringify(media),
        mediaUrl: media[0]?.url ? String(media[0].url) : null,
        mediaType: media[0]?.type ? String(media[0].type) : null,
        mood: body.mood ? String(body.mood).slice(0, 80) : null,
        identifiedUsers: body.identifiedUsers ? JSON.stringify(body.identifiedUsers) : null,
        visibility: ["public", "connections"].includes(body.visibility) ? body.visibility : "public",
        status: "published",
      },
      include: { author: { select: { id: true, name: true, title: true, image: true } } },
    });
    return reply.code(201).send({ ok: true, post: { ...post, media: media.length > 1 ? media : media[0] || null, createdAt: post.createdAt } });
  });

  app.post("/v1/posts/:id/like", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    const reaction = String(request.body?.reaction || "ok").slice(0, 40);
    const existing = await prisma.like.findFirst({ where: { postId: post.id, userId } });
    if (existing?.reaction === reaction) await prisma.like.delete({ where: { id: existing.id } });
    else if (existing) await prisma.like.update({ where: { id: existing.id }, data: { reaction } });
    else await prisma.like.create({ data: { postId: post.id, userId, reaction } });
    const likes = await prisma.like.findMany({ where: { postId: post.id }, select: { userId: true, reaction: true } });
    const current = likes.find((like) => like.userId === userId);
    return reply.send({ liked: Boolean(current), likes: likes.length, reaction: current?.reaction || null, reactions: likes.reduce((counts, like) => ({ ...counts, [like.reaction]: (counts[like.reaction] || 0) + 1 }), {}) });
  });

  app.post("/v1/posts/:id/save", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    const existing = await prisma.savedPost.findUnique({ where: { postId_userId: { postId: post.id, userId } } });
    if (existing) await prisma.savedPost.delete({ where: { id: existing.id } });
    else await prisma.savedPost.create({ data: { postId: post.id, userId } });
    const bookmarks = await prisma.savedPost.count({ where: { postId: post.id } });
    return reply.send({ bookmarked: !existing, bookmarks });
  });

  app.post("/v1/posts/:id/share", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    await prisma.postShare.create({ data: { postId: post.id, userId } });
    return reply.send({ shares: await prisma.postShare.count({ where: { postId: post.id } }) });
  });

  app.post("/v1/posts/:id/comments", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    const text = String(request.body?.text || "").trim();
    if (!text || text.length > 5000) return reply.code(400).send({ error: "Le commentaire est requis" });
    const parentId = request.body?.parentId ? String(request.body.parentId) : null;
    if (parentId && !(await prisma.comment.findFirst({ where: { id: parentId, postId: post.id } }))) return reply.code(400).send({ error: "Commentaire parent introuvable" });
    const comment = await prisma.comment.create({ data: { postId: post.id, authorId: userId, text, parentId, mediaData: Array.isArray(request.body?.media) ? JSON.stringify(request.body.media.slice(0, 10)) : null }, include: { author: { select: { name: true, image: true } } } });
    return reply.code(201).send(shapeComment(comment));
  });

  app.post("/v1/posts/:postId/comments/:commentId/reactions", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const comment = await prisma.comment.findFirst({ where: { id: request.params.commentId, postId: request.params.postId } });
    if (!comment) return reply.code(404).send({ error: "Commentaire introuvable" });
    const reaction = String(request.body?.reaction || "ok").slice(0, 40);
    const existing = await prisma.commentReaction.findFirst({ where: { commentId: comment.id, userId } });
    if (existing?.reaction === reaction) await prisma.commentReaction.delete({ where: { id: existing.id } });
    else if (existing) await prisma.commentReaction.update({ where: { id: existing.id }, data: { reaction } });
    else await prisma.commentReaction.create({ data: { commentId: comment.id, userId, reaction } });
    const totalReactions = await prisma.commentReaction.count({ where: { commentId: comment.id } });
    return reply.send({ reaction: existing?.reaction === reaction ? null : reaction, totalReactions });
  });

  app.patch("/v1/posts/:postId/comments/:commentId", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const comment = await prisma.comment.findFirst({ where: { id: request.params.commentId, postId: request.params.postId } });
    if (!comment) return reply.code(404).send({ error: "Commentaire introuvable" });
    if (comment.authorId !== userId) return reply.code(403).send({ error: "Vous ne pouvez modifier que votre commentaire" });
    const text = String(request.body?.text || "").trim();
    if (!text) return reply.code(400).send({ error: "Le commentaire est requis" });
    const updated = await prisma.comment.update({ where: { id: comment.id }, data: { text }, include: { author: { select: { name: true, image: true } } } });
    return reply.send(shapeComment(updated));
  });

  app.delete("/v1/posts/:postId/comments/:commentId", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const comment = await prisma.comment.findFirst({ where: { id: request.params.commentId, postId: request.params.postId } });
    if (!comment) return reply.code(404).send({ error: "Commentaire introuvable" });
    const post = await prisma.post.findUnique({ where: { id: request.params.postId } });
    if (comment.authorId !== userId && !(post && await canManagePost(post, userId))) return reply.code(403).send({ error: "Suppression non autorisée" });
    await prisma.comment.delete({ where: { id: comment.id } });
    return reply.send({ ok: true, deletedId: comment.id });
  });

  app.patch("/v1/posts/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    if (!(await canManagePost(post, userId))) return reply.code(403).send({ error: "Vous ne pouvez modifier que votre publication" });
    const data = {};
    if (typeof request.body?.text === "string") data.text = request.body.text.trim();
    if (["public", "connections"].includes(request.body?.visibility)) data.visibility = request.body.visibility;
    const updated = await prisma.post.update({ where: { id: post.id }, data });
    return reply.send({ ok: true, post: updated });
  });

  app.delete("/v1/posts/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return authError(reply);
    const post = await findPost(request.params.id, reply); if (!post) return;
    if (!(await canManagePost(post, userId))) return reply.code(403).send({ error: "Suppression non autorisée" });
    if (request.body?.mediaUrl) {
      const media = parseMedia(post.mediaData, post.mediaUrl, post.mediaType).filter((item) => item?.url !== request.body.mediaUrl);
      await prisma.post.update({ where: { id: post.id }, data: { mediaData: JSON.stringify(media), mediaUrl: media[0]?.url || null, mediaType: media[0]?.type || null } });
      return reply.send({ ok: true, postId: post.id });
    }
    await prisma.post.delete({ where: { id: post.id } });
    return reply.send({ ok: true, deletedId: post.id });
  });
}
