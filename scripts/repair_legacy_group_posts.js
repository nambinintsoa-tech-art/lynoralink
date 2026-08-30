/**
 * Script de réparation : normalisent les anciens posts de groupe
 * dans le JSON stocké en base de données.
 * 
 * Usage: node scripts/repair_legacy_group_posts.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function stripMarkdown(value = "") {
  return String(value)
    .replace(/[#>*_\-\[\]()`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function main() {
  console.log("📝 Réparation des anciens posts de groupe...\n");

  try {
    const groups = await prisma.group.findMany({
      select: { id: true, name: true, posts: true },
    });

    console.log(`✅ ${groups.length} groupes trouvés\n`);

    let totalRepaired = 0;
    let groupsModified = 0;

    for (const group of groups) {
      let posts = [];
      try {
        posts = group.posts
          ? typeof group.posts === "string"
            ? JSON.parse(group.posts)
            : Array.isArray(group.posts)
              ? group.posts
              : []
          : [];
      } catch (err) {
        console.warn(`  ⚠️ Impossible de parser les posts du groupe "${group.name}" (${group.id})`);
        continue;
      }

      if (!Array.isArray(posts) || posts.length === 0) {
        continue;
      }

      // Appliquer la normalisation legacy
      const repairedPosts = posts.map((post) => normalizeLegacyGroupPost(post));

      // Vérifier s'il y a des changements significatifs
      const hasChanges = posts.some((post, index) => {
        const repaired = repairedPosts[index];
        return (
          post.body !== repaired.body ||
          post.excerpt !== repaired.excerpt ||
          post.headline !== repaired.headline ||
          post.isArticle !== repaired.isArticle
        );
      });

      if (hasChanges) {
        await prisma.group.update({
          where: { id: group.id },
          data: { posts: JSON.stringify(repairedPosts) },
        });
        console.log(`  ✨ Groupe "${group.name}" (${group.id}) : ${posts.length} posts réparés`);
        totalRepaired += posts.length;
        groupsModified++;
      }
    }

    console.log(`\n✅ Réparation terminée:`);
    console.log(`   - ${groupsModified} groupe(s) modifié(s)`);
    console.log(`   - ${totalRepaired} post(s) réparé(s)\n`);
  } catch (error) {
    console.error("❌ Erreur lors de la réparation:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
