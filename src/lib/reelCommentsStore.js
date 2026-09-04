/**
 * /lib/reelCommentsStore.js
 * ─────────────────────────────────────────────────────────────────────────
 * Gestion du store des commentaires des réels
 * Partagé entre les routes d'API
 */

// Stockage temporaire en mémoire pour la démo (à remplacer par DB réelle)
export const reelCommentsStore = new Map();

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * Trouve un commentaire par ID dans la structure imbriquée
 */
export function findCommentById(comments, commentId) {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    if (comment.replies) {
      const found = findCommentById(comment.replies, commentId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Supprime un commentaire par ID dans la structure imbriquée
 */
export function removeCommentById(comments, commentId) {
  for (let i = 0; i < comments.length; i++) {
    if (comments[i].id === commentId) {
      comments.splice(i, 1);
      return true;
    }
    if (comments[i].replies) {
      if (removeCommentById(comments[i].replies, commentId)) return true;
    }
  }
  return false;
}

/**
 * Enrichit les commentaires avec le champ isOwn basé sur l'utilisateur actuel
 */
export function enrichCommentsWithOwnership(comments, currentUserId) {
  return comments.map(c => ({
    ...c,
    isOwn: currentUserId ? c.authorId === currentUserId : false,
    replies: c.replies ? enrichCommentsWithOwnership(c.replies, currentUserId) : [],
  }));
}
