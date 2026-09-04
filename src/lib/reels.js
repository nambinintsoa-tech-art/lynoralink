// Fichier utilities pour normaliser les données de reels depuis Prisma

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCommentCount(raw = {}) {
  if (Array.isArray(raw.comments)) return raw.comments.length;
  return asNumber(raw.comments ?? raw.commentCount ?? raw._count?.comments ?? 0);
}

function normalizeAuthor(author = {}) {
  const userId = author.id || author.userId || author.profileId || author.authorId || null;
  const pageId = author.pageId || author.companyPageId || author.companyId || null;
  const accountType = author.type || author.accountType || (pageId ? "page" : author.isPage ? "page" : "user");

  return {
    id: userId,
    userId,
    pageId,
    companyPageId: pageId,
    type: accountType,
    accountType,
    isPage: Boolean(author.isPage || author.type === "page" || author.type === "company" || pageId),
    name: author.name || "Compte",
    handle: author.handle || "@compte",
    avatar: author.avatar || author.image || null,
    verified: Boolean(author.verified),
  };
}

function normalizeReelPayload(raw = {}, index = 0) {
  const mediaList = Array.isArray(raw.media) ? raw.media : [];
  const validMedia = mediaList.filter(Boolean);
  const firstVideo = validMedia.find((item) => item && (item.type === "video" || /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(String(item.url || "")))) || null;
  const firstImage = validMedia.find((item) => item && item.type !== "video" && String(item.url || "").trim()) || null;
  const videoUrl = String(raw.videoUrl || raw.video || raw.url || (firstVideo && firstVideo.url) || "").trim() || null;
  const poster = String(raw.poster || raw.thumbnail || (firstImage && firstImage.url) || "").trim() || null;

  return {
    id: raw.id || `reel-${index + 1}`,
    videoUrl,
    poster,
    tone: Array.isArray(raw.tone) && raw.tone.length >= 2 ? raw.tone : [raw.tone?.[0] || "#1D2F5C", raw.tone?.[1] || "#0A1530"],
    author: normalizeAuthor(raw.author || raw.user || {}),
    caption: raw.caption || raw.text || raw.content || "Nouvelle publication",
    sound: raw.sound || "Son original",
    likes: asNumber(raw.likes ?? raw.likeCount ?? 0),
    comments: getCommentCount(raw),
    shares: asNumber(raw.shares ?? raw.shareCount ?? 0),
    following: Boolean(raw.following),
    liked: Boolean(raw.liked),
    saved: Boolean(raw.saved),
  };
}

function getReelsSource(rawReels = []) {
  if (!Array.isArray(rawReels)) return [];
  return rawReels
    .map((reel, index) => normalizeReelPayload(reel, index))
    .filter((reel) => reel.videoUrl || reel.poster);
}

function buildDemoReels({ limit = 10 } = {}) {
  // ⚠️ DEPRECATED - Use prisma.reel.findMany() instead
  console.warn('buildDemoReels is deprecated. Use getRealReels from API instead.');
  return [];
}

module.exports = {
  normalizeReelPayload,
  getReelsSource,
  buildDemoReels, // Deprecated - use getRealReels instead
};
