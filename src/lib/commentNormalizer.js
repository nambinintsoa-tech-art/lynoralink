/**
 * commentNormalizer.js
 * ─────────────────────────────────────────────────────────────────────────
 * Utilitaires pour normaliser et valider les commentaires à travers
 * l'application (posts, réels, articles, etc.)
 * 
 * Objectif: Assurer une cohérence structurelle des commentaires
 * dans toute l'application LynoraLink.
 */

/**
 * Normalise un commentaire vers la structure unifiée
 * @param {object} rawComment - Commentaire brut de n'importe quelle source
 * @param {object} options - Configuration
 * @returns {object} Commentaire normalisé
 */
export function normalizeComment(rawComment = {}, options = {}) {
  const {
    defaultAuthor = "Utilisateur",
    defaultInitials = "U",
    currentUserId = null,
  } = options;

  if (!rawComment || typeof rawComment !== "object") {
    return null;
  }

  const now = new Date();

  return {
    // Identité
    id: rawComment.id || `comment-${Date.now()}`,
    author: rawComment.author || defaultAuthor,
    initials:
      rawComment.initials ||
      ((rawComment.author || defaultAuthor)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || defaultInitials),
    avatarUrl: rawComment.avatarUrl || rawComment.image || null,
    authorId: rawComment.authorId || null,

    // Contenu
    text: String(rawComment.text || rawComment.content || "").trim(),
    media: normalizeCommentMedia(rawComment.media || rawComment.mediaData),

    // Timing
    time: parseDate(rawComment.time || rawComment.createdAt || now),
    at: formatRelativeTime(parseDate(rawComment.time || rawComment.createdAt || now)),

    // Réactions
    likes: Number(rawComment.likes || rawComment.totalReactions || 0),
    liked: Boolean(rawComment.liked),
    reaction: rawComment.reaction || null,
    reactionKeys: Array.isArray(rawComment.reactionKeys)
      ? rawComment.reactionKeys
      : rawComment.reaction
        ? [rawComment.reaction]
        : [],

    // Réponses (threading)
    replies: Array.isArray(rawComment.replies)
      ? rawComment.replies.map((reply) => normalizeComment(reply, options))
      : [],

    // Métadonnées
    parentId: rawComment.parentId || null,
    isOwn: rawComment.isOwn || rawComment.authorId === currentUserId,
    depth: rawComment.depth || 0,
  };
}

/**
 * Normalise la date d'un commentaire
 */
function parseDate(dateValue) {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

/**
 * Formate une date relative (ex: "à l'instant", "il y a 5 minutes")
 */
function formatRelativeTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "à l'instant";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;

  return date.toLocaleDateString("fr-FR");
}

/**
 * Normalise les médias d'un commentaire
 * @param {*} mediaData - Données brutes de médias
 * @returns {Array} Tableau de médias normalisé
 */
export function normalizeCommentMedia(mediaData) {
  if (!mediaData) return [];

  if (typeof mediaData === "string") {
    try {
      const parsed = JSON.parse(mediaData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(mediaData)) {
    return mediaData.filter((m) => m && m.url).map((m) => ({
      url: m.url,
      type: m.type || "image",
      label: m.label || null,
    }));
  }

  if (typeof mediaData === "object" && mediaData.url) {
    return [
      {
        url: mediaData.url,
        type: mediaData.type || "image",
        label: mediaData.label || null,
      },
    ];
  }

  return [];
}

/**
 * Normalise un tableau de commentaires
 * @param {Array} comments - Commentaires bruts
 * @param {object} options - Configuration
 * @returns {Array} Commentaires normalisés
 */
export function normalizeComments(comments = [], options = {}) {
  if (!Array.isArray(comments)) return [];
  return comments
    .map((comment) => normalizeComment(comment, options))
    .filter(Boolean);
}

/**
 * Valide qu'un commentaire contient du contenu
 * @param {object} comment - Commentaire à valider
 * @returns {boolean} True si le commentaire est valide
 */
export function isValidComment(comment) {
  if (!comment || typeof comment !== "object") return false;
  const hasText = typeof comment.text === "string" && comment.text.trim().length > 0;
  const hasMedia = Array.isArray(comment.media) && comment.media.length > 0;
  return hasText || hasMedia;
}

/**
 * Compte le nombre total de commentaires (incluant les réponses)
 * @param {Array} comments - Tableau de commentaires
 * @returns {number} Nombre total
 */
export function countTotalComments(comments = []) {
  if (!Array.isArray(comments)) return 0;
  return comments.reduce((total, comment) => {
    return total + 1 + countTotalComments(comment.replies || []);
  }, 0);
}

/**
 * Crée une structure de commentaire vide
 * @param {object} options - Configuration initiale
 * @returns {object} Commentaire vide normalisé
 */
export function createEmptyComment(options = {}) {
  return normalizeComment({
    id: `local-${Date.now()}`,
    author: options.author || "Vous",
    text: "",
    media: [],
  }, options);
}

/**
 * Enrichit un commentaire avec les données de l'utilisateur actuel
 * @param {object} comment - Commentaire brut
 * @param {object} currentUser - Utilisateur actuel { id, name, image }
 * @returns {object} Commentaire enrichi
 */
export function enrichCommentWithUser(comment, currentUser) {
  if (!comment || !currentUser) return comment;

  return {
    ...comment,
    authorId: comment.authorId || currentUser.id,
    avatarUrl: comment.avatarUrl || currentUser.image || null,
    isOwn: comment.authorId === currentUser.id || comment.author === currentUser.name,
  };
}

/**
 * Exporte les valeurs par défaut pour la configuration
 */
export const COMMENT_DEFAULTS = {
  author: "Utilisateur",
  initials: "U",
  time: new Date(),
  likes: 0,
  liked: false,
  reaction: null,
  reactionKeys: [],
  replies: [],
  media: [],
  isOwn: false,
  depth: 0,
};
