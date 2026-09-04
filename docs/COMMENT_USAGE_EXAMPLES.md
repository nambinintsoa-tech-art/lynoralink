/**
 * EXEMPLES D'UTILISATION - Commentaires unifiés
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Cas d'usage courants pour travailler avec les commentaires
 * dans LynoraLink après l'alignement.
 */

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 1: Créer un nouveau commentaire (Réels)
// ─────────────────────────────────────────────────────────────────────────

import { normalizeComment } from "@/lib/commentNormalizer";

function submitComment(draftText) {
  if (!draftText.trim()) return;
  
  // Créer un commentaire normalisé
  const newComment = normalizeComment({
    id: `local-${Date.now()}`,
    author: "Vous",
    text: draftText,
    time: new Date(),
    media: [],
  });
  
  // Ajouter au state
  setCommentThreads((current) => ({
    ...current,
    [reelId]: [...(current[reelId] || []), newComment],
  }));
  
  // Incrémenter le compteur
  setReels((current) =>
    current.map((reel) =>
      reel.id === reelId
        ? { ...reel, comments: reel.comments + 1 }
        : reel
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 2: Convertir les données de l'API POST en commentaires
// ─────────────────────────────────────────────────────────────────────────

import { normalizeComments } from "@/lib/commentNormalizer";

async function loadPostComments(postId) {
  const response = await fetch(`/api/posts/${postId}`);
  const data = await response.json();
  
  // Les commentaires viennent de la DB avec une structure différente
  const rawComments = data.comments; // Format DB
  
  // Normaliser pour la cohérence
  const normalizedComments = normalizeComments(rawComments, {
    currentUserId: session.user.id,
  });
  
  setLocalComments(normalizedComments);
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 3: Afficher un commentaire avec toutes ses données
// ─────────────────────────────────────────────────────────────────────────

import React from "react";

function CommentDisplay({ comment }) {
  return (
    <div className="comment">
      {/* Avatar */}
      <img
        src={comment.avatarUrl || "/default-avatar.png"}
        alt={comment.author}
        className="comment-avatar"
      />
      
      <div className="comment-body">
        {/* Auteur */}
        <div className="comment-header">
          <strong>{comment.author}</strong>
          <span className="comment-initials">({comment.initials})</span>
          {comment.isOwn && <span className="badge">Vous</span>}
        </div>
        
        {/* Texte */}
        <p className="comment-text">{comment.text}</p>
        
        {/* Médias */}
        {comment.media && comment.media.length > 0 && (
          <div className="comment-media">
            {comment.media.map((m) => (
              <img
                key={m.url}
                src={m.url}
                alt={m.label || "Média"}
                className="media-thumbnail"
              />
            ))}
          </div>
        )}
        
        {/* Métadonnées */}
        <div className="comment-meta">
          <span className="comment-time" title={comment.time?.toLocaleString()}>
            {comment.at}
          </span>
          
          {/* Réactions */}
          {comment.likes > 0 && (
            <span className="comment-likes">
              ❤️ {comment.likes}
            </span>
          )}
          
          {/* Actions */}
          <button onClick={() => handleReact(comment.id)}>J'aime</button>
          <button onClick={() => handleReply(comment.id)}>Répondre</button>
        </div>
        
        {/* Réponses imbriquées */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            <details>
              <summary>
                {comment.replies.length} réponse
                {comment.replies.length > 1 ? "s" : ""}
              </summary>
              {comment.replies.map((reply) => (
                <CommentDisplay key={reply.id} comment={reply} />
              ))}
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 4: Ajouter une réaction à un commentaire
// ─────────────────────────────────────────────────────────────────────────

async function toggleCommentReaction(commentId, reactionKey) {
  try {
    const response = await fetch(
      `/api/posts/${postId}/comments/${commentId}/reactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: reactionKey }),
      }
    );
    
    if (!response.ok) throw new Error("Erreur serveur");
    
    const data = await response.json();
    
    // Mettre à jour le commentaire local
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              reaction: data.reaction,
              liked: !!data.reaction,
              likes: data.totalReactions,
            }
          : c
      )
    );
  } catch (error) {
    console.error("Erreur lors de la réaction:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 5: Valider et créer une réponse
// ─────────────────────────────────────────────────────────────────────────

import { isValidComment, normalizeComment } from "@/lib/commentNormalizer";

async function submitReply(parentCommentId, replyText, media = []) {
  // Valider le contenu
  if (!replyText.trim() && media.length === 0) {
    alert("La réponse ne peut pas être vide");
    return;
  }
  
  // Créer une réponse normalisée
  const newReply = normalizeComment({
    id: `reply-${Date.now()}`,
    author: currentUser.name,
    avatarUrl: currentUser.image,
    authorId: currentUser.id,
    text: replyText,
    time: new Date(),
    media: media,
    parentId: parentCommentId,
  });
  
  // Valider le contenu
  if (!isValidComment(newReply)) {
    alert("Le contenu de la réponse n'est pas valide");
    return;
  }
  
  // Ajouter à la réponse parent
  setLocalComments((prev) =>
    prev.map((c) =>
      c.id === parentCommentId
        ? {
            ...c,
            replies: [...(c.replies || []), newReply],
          }
        : c
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 6: Compter tous les commentaires (incluant les réponses)
// ─────────────────────────────────────────────────────────────────────────

import { countTotalComments } from "@/lib/commentNormalizer";

function PostStats({ post }) {
  const totalComments = countTotalComments(post.comments);
  
  return (
    <div className="stats">
      <span>{post.likes} j'aime</span>
      <span>{totalComments} commentaires</span>
      <span>{post.shares} partages</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 7: Enrichir un commentaire avec les données utilisateur
// ─────────────────────────────────────────────────────────────────────────

import { enrichCommentWithUser } from "@/lib/commentNormalizer";

function saveCommentToDB(rawComment) {
  // Enrichir avec l'utilisateur actuel
  const enriched = enrichCommentWithUser(rawComment, {
    id: session.user.id,
    name: session.user.name,
    image: session.user.image,
  });
  
  // Sauvegarder en DB
  return fetch("/api/posts/123/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enriched),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 8: Filtrer et rechercher dans les commentaires
// ─────────────────────────────────────────────────────────────────────────

function searchComments(comments, query) {
  const lowerQuery = query.toLowerCase();
  
  function searchInComment(comment) {
    const matches =
      comment.text.toLowerCase().includes(lowerQuery) ||
      comment.author.toLowerCase().includes(lowerQuery);
    
    return matches
      ? {
          ...comment,
          // Marquer les réponses trouvées aussi
          replies: comment.replies?.filter(searchInComment) || [],
        }
      : null;
  }
  
  return comments
    .map((c) => searchInComment(c))
    .filter((c) => c !== null);
}

// Utilisation:
const results = searchComments(comments, "ux");
// Retourne les commentaires et réponses qui contiennent "ux"

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 9: Éditer un commentaire existant
// ─────────────────────────────────────────────────────────────────────────

async function editComment(commentId, newText, postId) {
  if (!newText.trim()) {
    alert("Le texte ne peut pas être vide");
    return;
  }
  
  try {
    const response = await fetch(
      `/api/posts/${postId}/comments/${commentId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      }
    );
    
    if (!response.ok) throw new Error("Erreur serveur");
    
    const updated = await response.json();
    
    // Mettre à jour localement
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              text: newText,
              time: new Date(),
              at: "à l'instant",
            }
          : c
      )
    );
  } catch (error) {
    console.error("Erreur lors de l'édition:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLE 10: Supprimer un commentaire avec cascading
// ─────────────────────────────────────────────────────────────────────────

async function deleteComment(commentId, postId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce commentaire?")) {
    return;
  }
  
  try {
    const response = await fetch(
      `/api/posts/${postId}/comments/${commentId}`,
      { method: "DELETE" }
    );
    
    if (!response.ok) throw new Error("Erreur serveur");
    
    // Mettre à jour localement (avec support cascading)
    setLocalComments((prev) =>
      prev
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r.id !== commentId),
        }))
    );
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RÉSUMÉ DES FONCTIONS DISPONIBLES
// ─────────────────────────────────────────────────────────────────────────

/*
UTILITAIRES DISPONIBLES:

✅ normalizeComment(rawComment, options)
   → Normalise un commentaire unique

✅ normalizeComments(comments, options)
   → Normalise un tableau de commentaires

✅ normalizeCommentMedia(mediaData)
   → Normalise les médias

✅ isValidComment(comment)
   → Valide qu'un commentaire a du contenu

✅ countTotalComments(comments)
   → Compte tous les commentaires + réponses

✅ createEmptyComment(options)
   → Crée un commentaire vide structuré

✅ enrichCommentWithUser(comment, currentUser)
   → Ajoute les données utilisateur

✅ formatRelativeTime(date)
   → Format français des timestamps (INTERNE)
*/

export {};
