import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FeedShell from "@/components/FeedShell";

// Le filtrage par motifs de texte était trop large et masquait des contenus réels.
// On garde le feed sur les publications publiées uniquement jusqu'à l'introduction d'un vrai flag de seed.

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  const feedSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      createdAt: { gte: feedSince },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, name: true, title: true, image: true, email: true } },
      likes: { select: { userId: true, reaction: true } },
      _count: { select: { savedPosts: true, shares: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        where: { parentId: null },
        include: {
          author: { select: { name: true, image: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { name: true, image: true } },
            },
          },
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
        // Keep the creator identity when page settings are malformed.
      }
    });
  }

  const shaped = posts.map((p) => {
    let parsedMedia = [];
    try {
      parsedMedia = p.mediaData ? JSON.parse(p.mediaData) : [];
    } catch {
      parsedMedia = [];
    }

    const mediaList = parsedMedia.length
      ? parsedMedia
      : p.mediaUrl ? [{ type: p.mediaType || "image", url: p.mediaUrl }] : [];
    const mediaValue = mediaList.length > 1 ? mediaList : mediaList[0] || null;
    const page = p.companyPageId ? companyPageSettings.get(p.companyPageId) : null;
    const isSystemAnnouncement = Boolean(
      p.presentation === "announcement" ||
      (typeof p.presentation === "string" && p.presentation.includes('"type":"announcement"')) ||
      (p.presentation && typeof p.presentation === "object" && p.presentation.type === "announcement")
    );
    const isPlatformActor = Boolean(
      p.author?.role === "admin" ||
      (process.env.NEXT_PUBLIC_ADMIN_EMAIL && p.author?.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase())
    );
    const displayName = isSystemAnnouncement ? "LynoraLink" : (page?.name || p.author.name);
    const displayImage = isSystemAnnouncement ? "/logo_lynora.svg" : (page?.logoUrl || p.author.image || null);
    const displayTitle = isSystemAnnouncement || isPlatformActor ? "Plateforme" : (page ? "Page entreprise" : (p.author.title || "Membre"));

    const currentUserLike = p.likes.find((like) => like.userId === session?.user?.id);

    return {
      id: p.id,
      authorId: p.authorId,
      companyPageId: p.companyPageId || null,
      author: displayName,
      title: displayTitle,
      initials: initials(displayName),
      avatarUrl: displayImage,
      time: p.createdAt,
      likes: p.likes.length,
      reaction: currentUserLike?.reaction || null,
      reactions: p.likes.reduce((counts, like) => {
        counts[like.reaction || "ok"] = (counts[like.reaction || "ok"] || 0) + 1;
        return counts;
      }, {}),
      liked: p.likes.some((l) => l.userId === session?.user?.id),
      bookmarked: savedPostIds.has(p.id),
      bookmarks: p._count?.savedPosts || 0,
      shares: p._count?.shares || 0,
      isArticle: p.isArticle,
      text: p.text,
      headline: p.headline,
      excerpt: p.excerpt,
      body: p.body,
      media: mediaValue,
      comments: p.comments.map((c) => ({
        id: c.id,
        author: c.author.name,
        initials: initials(c.author.name),
        avatarUrl: c.author.image || null,
        text: c.text,
        time: c.createdAt,
        likes: 0,
        liked: false,
        replies: (c.replies || []).map((reply) => ({
          id: reply.id,
          author: reply.author.name,
          initials: initials(reply.author.name),
          avatarUrl: reply.author.image || null,
          text: reply.text,
          time: reply.createdAt,
          likes: 0,
          liked: false,
        })),
      })),
    };
  });

  return <FeedShell initialPosts={shaped} />;
}
