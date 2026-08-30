"use client";

/**
 * PostCard.jsx — LynoraLink
 * ─────────────────────────────────────────────────────────────────────────
 * Carte de publication autonome et réutilisable.
 *
 * Props
 * ─────
 *  post                  {object}   Objet publication (voir shape ci-dessous)
 *  currentUser           {object}   { name, initials, avatarUrl? }
 *  onToggleLike          {fn}       (postId) => void
 *  onToggleBookmark      {fn}       (postId) => void
 *  onAddComment          {fn}       (postId, text) => void
 *  onShare               {fn}       (postId) => void
 *  onOpenArticle         {fn?}      (post) => void — si post.isArticle
 *  onOpenPost            {fn?}      (post) => void — vue étendue
 *  onDelete              {fn?}      (postId) => void — optionnel (auteur)
 *  isOwn                 {bool}     true si la publication appartient à currentUser
 *
 * Shape minimale d'un post
 * ─────────────────────────
 *  {
 *    id, author, initials, avatarUrl?, title, time, visibility?,
 *
 *    // ── Champs communs ──────────────────────────────────────────
 *    liked, likes, bookmarked,
 *    comments: [{ id, author, initials, avatarUrl?, text, time? }],
 *    shares?,
 *
 *    // ── Publication standard ────────────────────────────────────
 *    text?,
 *    media?: Array<{ url, type: "image"|"video", label? }>
 *            OU objet unique { url, type, label } (rétro-compat)
 *
 *    // ── Article (isArticle: true) ────────────────────────────────
 *    isArticle?: bool,
 *    headline?,         Titre principal
 *    excerpt?,          Sous-titre / résumé affiché dans la carte
 *    body?,             Corps complet (Markdown léger) — pour ArticleViewerPreview
 *    readingTime?,      Durée en minutes (auto-calculée si absent)
 *    coverUrl?,         URL de l'image de couverture (priorité sur media[0])
 *    tags?: string[],   Badges thématiques affichés sous l'extrait
 *    bio?,              Courte bio de l'auteur (utilisée dans ArticleViewerPreview)
 *  }
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Globe, Lock, Users, BookOpen, PlayCircle, Image as ImageIcon,
  Send, ExternalLink, X, Flag, EyeOff, Link2, Trash2, ChevronDown,
  Clock, Tag, ArrowRight, CornerUpLeft,
} from "lucide-react";
import ReactionPicker from "@/components/ReactionPicker";
import Emojipicker from "@/components/Emojipicker";
import RelativeTime from "@/components/RelativeTime";

/* ── Tokens ──────────────────────────────────────────────────────────── */
const C = {
  navy900:    "#0F3352",
  navy800:    "#1B5386",
  navy700:    "#2C6BA0",
  navy100:    "#DCE7F1",
  navy50:     "#EFF4F9",
  gold400:    "#F6D374",
  gold600:    "#D9A536",
  ink:        "#132433",
  muted:      "#5C7488",
  mutedLight: "#8CA0B3",
  line:       "#E3EAF1",
  white:      "#FFFFFF",
  danger:     "#C24444",
  success:    "#2E9E5B",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* ── Utilitaires ─────────────────────────────────────────────────────── */

/** Normalise media en tableau (rétro-compatibilité objet unique) */
function normalizeMedia(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Formate un nombre (ex. 1200 → "1,2 k") */
function fmtCount(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")} k`;
  return String(n);
}

/** Estime la durée de lecture en minutes */
function readingTime(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ── Sous-composants atomiques ───────────────────────────────────────── */

function Avatar({ initials = "?", size = 44, imgUrl = null, ring = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: imgUrl ? C.navy100 : navyGrad,
        color: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: "'Sora', sans-serif",
        flexShrink: 0,
        overflow: "hidden",
        letterSpacing: "-0.02em",
        border: ring ? `3px solid ${C.white}` : "none",
        boxShadow: ring ? `0 0 0 4px ${C.gold600}` : "none",
      }}
    >
      {imgUrl
        ? <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        : initials}
    </div>
  );
}

function VisibilityIcon({ v = "Public" }) {
  if (v === "Privé")              return <Lock size={10} />;
  if (v === "Relations uniquement") return <Users size={10} />;
  return <Globe size={10} />;
}

/* ── Galerie multi-médias ────────────────────────────────────────────── */

function MediaGallery({ items, onOpenPost }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const count = items.length;

  const openLightbox = useCallback((i, e) => {
    e.stopPropagation();
    // If an external open handler is provided, prefer it (caller typically binds the full post)
    if (typeof onOpenPost === "function") {
      onOpenPost();
      return;
    }
    // Pour les vidéos, laisser le lecteur natif gérer
    if (items[i]?.type === "video") return;
    setLightboxIdx(i);
  }, [items, onOpenPost]);

  if (count === 0) return null;

  /* Rendu d'un seul item */
  const renderItem = (item, index, style = {}) => {
    if (!item.url) {
      return (
        <div
          key={index}
          style={{
            background: navyGrad, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            color: "rgba(255,255,255,0.9)", ...style,
          }}
        >
          {item.type === "video"
            ? <PlayCircle size={40} color={C.gold400} />
            : <ImageIcon size={36} color={C.gold400} />}
          {item.label && (
            <span style={{ fontSize: 12.5, fontWeight: 600, padding: "0 20px", textAlign: "center" }}>
              {item.label}
            </span>
          )}
        </div>
      );
    }

    if (item.type === "video") {
      return (
        <video
          key={index}
          src={item.url}
          controls
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000", ...style }}
        />
      );
    }

    return (
      <img
        key={index}
        src={item.url}
        alt={item.label || `Média ${index + 1}`}
        onClick={(e) => openLightbox(index, e)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer", ...style }}
      />
    );
  };

  /* Layouts selon le nombre de médias */
  const wrapStyle = {
    borderRadius: 14,
    overflow: "hidden",
    margin: "0 0 4px",
    cursor: onOpenPost ? "pointer" : "default",
  };

  let galleryContent;

  if (count === 1) {
    galleryContent = (
      <div style={{ ...wrapStyle, width: "100%", minHeight: 280 }} onClick={() => onOpenPost?.()}>
        {renderItem(items[0], 0)}
      </div>
    );
  } else if (count === 2) {
    galleryContent = (
      <div style={{ ...wrapStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, minHeight: 260 }}>
        {items.map((item, i) => (
          <div key={i} style={{ overflow: "hidden", minHeight: 260 }}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  } else {
    /* 4+ : afficher les 4 premiers médias, avec overlay +X sur le 4e */
    const visible = items.slice(0, 4);
    const overflow = count - 4;
    galleryContent = (
      <div style={{ ...wrapStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, minHeight: 300 }}>
        {visible.map((item, i) => (
          <div
            key={i}
            style={{
              overflow: "hidden",
              position: "relative",
              minHeight: i === 0 ? 220 : 150,
            }}
          >
            {renderItem(item, i)}
            {i === 3 && overflow > 0 && (
              <div
                onClick={(e) => { e.stopPropagation(); onOpenPost?.(); }}
                style={{
                  position: "absolute", inset: 0,
                  background: "rgba(15,36,51,0.72)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 800, color: C.white, fontFamily: "'Sora', sans-serif" }}>
                  +{overflow}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {galleryContent}

      {/* Lightbox image */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(10,22,35,0.94)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            style={{
              position: "absolute", top: 20, right: 20, width: 40, height: 40,
              borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)",
              color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
          <img
            src={items[lightboxIdx]?.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
          />
          {count > 1 && (
            <div style={{ position: "absolute", bottom: 20, display: "flex", gap: 6 }}>
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  style={{
                    width: i === lightboxIdx ? 22 : 8, height: 8, borderRadius: 999,
                    border: "none", cursor: "pointer",
                    background: i === lightboxIdx ? C.gold400 : "rgba(255,255,255,0.35)",
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Section actions ─────────────────────────────────────────────────── */

function ActionBar({ post, onToggleLike, onToggleBookmark, onShare, onToggleComments, onOpenArticle, justShared }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerCloseTimer = useRef(null);

  const openReactionPicker = () => {
    clearTimeout(pickerCloseTimer.current);
    setShowReactionPicker(true);
  };
  const scheduleReactionClose = () => {
    clearTimeout(pickerCloseTimer.current);
    pickerCloseTimer.current = window.setTimeout(() => setShowReactionPicker(false), 220);
  };
  const cancelReactionClose = () => clearTimeout(pickerCloseTimer.current);

  const handleReactionSelect = () => {
    onToggleLike(post.id);
    setShowReactionPicker(false);
  };

  // ── Actions communes ──────────────────────────────────────────────────
  const likeAction = {
    key: "like",
    icon: ThumbsUp,
    label: "J'aime",
    active: post.liked,
    activeColor: C.gold600,
    onClick: () => onToggleLike(post.id),
    fill: post.liked,
    reaction: true,
  };

  const shareAction = {
    key: "share",
    icon: Share2,
    label: justShared ? "Partagé !" : "Partager",
    onClick: onShare,
    active: justShared,
    activeColor: C.success,
  };

  const bookmarkAction = {
    key: "bookmark",
    icon: Bookmark,
    label: "Enregistrer",
    active: post.bookmarked,
    activeColor: C.navy800,
    onClick: () => onToggleBookmark(post.id),
    fill: post.bookmarked,
  };

  // ── Jeu d'actions selon le type de publication ────────────────────────
  const actions = post.isArticle
    ? [
        likeAction,
        // "Commenter" → redirige vers le lecteur d'article (commentaires en bas)
        {
          key: "comment-article",
          icon: MessageCircle,
          label: "Commenter",
          onClick: () => onOpenArticle?.(post),
        },
        shareAction,
        bookmarkAction,
      ]
    : [
        likeAction,
        {
          key: "comment",
          icon: MessageCircle,
          label: "Commenter",
          onClick: onToggleComments,
        },
        shareAction,
        bookmarkAction,
      ];

  return (
    <div style={{ display: "flex", padding: "2px 8px" }}>
      {actions.map(({ key, icon: Icon, label, active, activeColor = C.muted, onClick, fill, reaction }) => {
        if (!reaction) {
          return (
            <button
              key={key}
              onClick={onClick}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "9px 0", borderRadius: 10, border: "none",
                background: "transparent", cursor: "pointer", fontSize: 12.5,
                fontWeight: 600, color: active ? activeColor : C.muted,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={16} fill={fill && active ? activeColor : "none"} color={active ? activeColor : C.muted} />
              <span className="pc-action-label">{label}</span>
            </button>
          );
        }

        // Bouton J'aime avec ReactionPicker
        return (
          <div
            key={key}
            style={{ position: "relative", flex: 1 }}
            onMouseEnter={openReactionPicker}
            onMouseLeave={scheduleReactionClose}
          >
            {showReactionPicker && (
              <div
                onMouseEnter={cancelReactionClose}
                onMouseLeave={scheduleReactionClose}
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  transform: "translateY(-8px)",
                  zIndex: 30,
                }}
              >
                <ReactionPicker
                  selectedKey={post.liked ? "like" : null}
                  onSelect={handleReactionSelect}
                />
              </div>
            )}
            <button
              onClick={onClick}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "9px 0", borderRadius: 10, border: "none",
                background: "transparent", cursor: "pointer", fontSize: 12.5,
                fontWeight: 600, color: active ? activeColor : C.muted,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <Icon size={16} fill={fill && active ? activeColor : "none"} color={active ? activeColor : C.muted} />
              <span className="pc-action-label">{label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Menu contextuel "…" ─────────────────────────────────────────────── */

function ContextMenu({ isOwn, onDelete, onOpenPost, onOpenArticle, onClose }) {
  const items = [
    onOpenArticle && { icon: BookOpen,    label: "Lire l'article",         onClick: onOpenArticle },
    onOpenPost    && { icon: ExternalLink, label: "Ouvrir la publication",  onClick: onOpenPost },
    { icon: Link2,  label: "Copier le lien", onClick: () => navigator.clipboard?.writeText(window.location.href) },
    !isOwn && { icon: EyeOff, label: "Masquer cette publication", onClick: onClose },
    !isOwn && { icon: Flag,   label: "Signaler", onClick: onClose, danger: true },
    isOwn  && { icon: Trash2, label: "Supprimer", onClick: onDelete, danger: true },
  ].filter(Boolean);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: 38, right: 0, zIndex: 50,
        background: C.white, border: `1px solid ${C.line}`,
        borderRadius: 12, boxShadow: "0 8px 28px rgba(15,51,82,0.16)",
        minWidth: 210, overflow: "hidden",
      }}
    >
      {items.map(({ icon: Icon, label, onClick, danger }) => (
        <button
          key={label}
          onClick={() => { onClick?.(); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 14px", border: "none", background: "transparent",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            color: danger ? C.danger : C.ink, textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#FBEDED" : C.navy50)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}

/* ── Zone commentaires ───────────────────────────────────────────────── */

function CommentItem({ comment, currentUser, onStartReply, depth = 0 }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ marginLeft: depth * 34 }}>
      <div style={{ display: "flex", gap: 9 }}>
        <Avatar initials={comment.initials} size={depth ? 28 : 30} imgUrl={comment.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: C.navy50, borderRadius: 14, padding: "8px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{comment.author}</div>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 2, lineHeight: 1.5 }}>{comment.text}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, marginLeft: 6, fontSize: 11.5, color: C.muted }}>
            <span>{comment.time || "À l'instant"}</span>
            {depth === 0 && (
              <button
                onClick={() => setReplying((r) => !r)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, color: C.muted, display: "flex", alignItems: "center", gap: 3 }}
              >
                <CornerUpLeft size={11} /> Répondre
              </button>
            )}
          </div>

          }>
              <Avatar initials={currentUser.initials} size={26} imgUrl={currentUser.avatarUrl} />
              <div style={{ flex: 1, display: "flex", alignItems: "center", background: C.navy50, borderRadius: 999, padding: "3px 4px 3px 12px" }}>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitReply()}
                  placeholder={`Répondre à ${comment.author}...`}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: C.ink }}
                />
                <button
                  onClick={submitReply}
                  disabled={!draft.trim() || submitting}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", border: "none",
                    background: draft.trim() && !submitting ? C.navy800 : C.line, color: C.white,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: draft.trim() && !submitting ? "pointer" : "default", flexShrink: 0,
                  }}
                >
                  {submitting ? (
                    <span style={{ width: 12, height: 12, border: `2px solid ${C.white}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  ) : (
                    <Send size={12} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Réponses imbriquées */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onStartReply={onStartReply}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentSection({ post, currentUser, onAddComment, onReplyComment }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef(null);

  const submit = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(post.id, draft.trim());
      setDraft("");
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Liste des commentaires */}
      {post.comments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {post.comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onReply={onReplyComment}
              depth={0}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: "20px", textAlign: "center", color: C.mutedLight, fontSize: 13 }}>
          Aucun commentaire pour le moment. Soyez le premier !
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
        <Avatar initials={currentUser.initials} size={30} imgUrl={currentUser.avatarUrl} />
        <div
          ref={emojiRef}
          style={{
            flex: 1, display: "flex", alignItems: "center",
            background: C.navy50, border: `1px solid ${C.line}`,
            borderRadius: 999, padding: "4px 4px 4px 14px",
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Ajouter un commentaire…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: C.ink }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setShowEmoji((value) => !value)}
              style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted }}
            >
              <span style={{ fontSize: 14 }}>🙂</span>
            </button>
            {showEmoji && (
              <div style={{ position: "absolute", bottom: 38, right: 0, zIndex: 20 }}>
                <Emojipicker
                  emojis={["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "👏", "💡"]}
                  onSelect={(emoji) => {
                    setDraft((current) => `${current}${emoji}`);
                    setShowEmoji(false);
                  }}
                  size={30}
                />
              </div>
            )}
          </div>
          <button
            onClick={submit}
            disabled={!draft.trim() || submitting}
            title="Envoyer"
            style={{
              width: 30, height: 30, borderRadius: "50%", border: "none",
              background: draft.trim() && !submitting ? C.navy800 : C.line, color: C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: draft.trim() && !submitting ? "pointer" : "default",
              transition: "background 0.15s ease", flexShrink: 0,
            }}
          >
            {submitting ? (
              <span style={{ width: 12, height: 12, border: `2px solid ${C.white}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

<style>{`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`}</style>

/* ── Bandeau article enrichi ─────────────────────────────────────────── */

/**
 * ArticleBanner — carte de prévisualisation d'un article dans le fil.
 *
 * Fonctionnalités article spécifiques :
 *  • Image de couverture (coverUrl prioritaire sur media[0])
 *  • Titre cliquable + extrait
 *  • Durée de lecture estimée (readingTime ou calcul auto depuis body)
 *  • Badges de tags thématiques
 *  • Bouton CTA "Lire l'article" dans le fallback cover
 *  • Hover effect sur la zone cover + titre
 */
function ArticleBanner({ post, onOpenArticle }) {
  const [coverHovered, setCoverHovered] = useState(false);

  // Résolution de la cover : coverUrl > media[0].url > fallback
  const coverMedia = normalizeMedia(post.media)[0];
  const coverSrc = post.coverUrl || coverMedia?.url || null;

  // Durée de lecture
  const minutes = post.readingTime ?? readingTime(post.body || post.text || "");

  const canOpen = typeof onOpenArticle === "function";

  return (
    <div style={{ padding: "0 16px 12px" }}>

      {/* ── Texte introductif du post (facultatif) ── */}
      {post.text && (
        <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.65, margin: "0 0 14px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {post.text}
        </p>
      )}

      {/* ── Carte article ── */}
      <div
        style={{
          border: `1px solid ${C.line}`,
          borderRadius: 14,
          overflow: "hidden",
          cursor: canOpen ? "pointer" : "default",
          transition: "box-shadow 0.18s ease, border-color 0.18s ease",
          boxShadow: coverHovered && canOpen
            ? "0 4px 20px rgba(15,51,82,0.13)"
            : "0 1px 4px rgba(15,51,82,0.06)",
          borderColor: coverHovered && canOpen ? C.navy100 : C.line,
        }}
        onMouseEnter={() => setCoverHovered(true)}
        onMouseLeave={() => setCoverHovered(false)}
        onClick={() => canOpen && onOpenArticle(post)}
      >
        {/* Cover */}
        <div style={{ position: "relative", width: "100%", height: coverSrc ? 200 : 160 }}>
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={post.headline || "Couverture de l'article"}
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                transition: "transform 0.3s ease",
                transform: coverHovered && canOpen ? "scale(1.02)" : "scale(1)",
              }}
            />
          ) : (
            /* Fallback cover navy/doré */
            <div style={{
              width: "100%", height: "100%",
              background: navyGrad,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <BookOpen size={38} color={C.gold400} />
              <span style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13,
                color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em",
              }}>
                Article LynoraLink
              </span>
            </div>
          )}

          {/* Pill "Article" flottant sur la cover */}
          <div style={{
            position: "absolute", top: 10, left: 10,
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(15,51,82,0.78)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px", borderRadius: 999,
          }}>
            <BookOpen size={11} color={C.gold400} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold400, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Article
            </span>
          </div>

          {/* Durée de lecture flottante */}
          <div style={{
            position: "absolute", top: 10, right: 10,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(15,51,82,0.78)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px", borderRadius: 999,
          }}>
            <Clock size={11} color="rgba(255,255,255,0.75)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              {minutes} min
            </span>
          </div>
        </div>

        {/* Corps texte de la carte */}
        <div style={{ padding: "14px 14px 12px", background: C.white }}>

          {/* Titre */}
          {post.headline && (
            <h3 style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 800,
              fontSize: 17, lineHeight: 1.35, color: C.ink,
              margin: "0 0 7px", letterSpacing: "-0.01em",
              transition: "color 0.15s ease",
              color: coverHovered && canOpen ? C.navy800 : C.ink,
            }}>
              {post.headline}
            </h3>
          )}

          {/* Extrait */}
          {post.excerpt && (
            <p style={{
              fontSize: 13, color: C.muted, lineHeight: 1.6,
              margin: "0 0 10px",
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {post.excerpt}
            </p>
          )}

          {/* Tags thématiques */}
          {post.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 10px" }}>
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 999,
                    background: C.navy50, border: `1px solid ${C.line}`,
                    fontSize: 11, fontWeight: 600, color: C.navy700,
                  }}
                >
                  <Tag size={9} />
                  {tag}
                </span>
              ))}
              {post.tags.length > 4 && (
                <span style={{ fontSize: 11, color: C.mutedLight, alignSelf: "center" }}>
                  +{post.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Pied de carte : auteur abrégé + CTA */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 10, borderTop: `1px solid ${C.line}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: post.avatarUrl ? C.navy100 : navyGrad,
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: C.white,
                fontFamily: "'Sora', sans-serif",
              }}>
                {post.avatarUrl
                  ? <img src={post.avatarUrl} alt={post.author} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (post.initials || "?")
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{post.author}</span>
            </div>

            {canOpen && (
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 12, fontWeight: 700, color: C.navy800,
                transition: "gap 0.15s ease",
                gap: coverHovered ? 6 : 4,
              }}>
                Lire l'article
                <ArrowRight size={13} style={{ transition: "transform 0.15s ease", transform: coverHovered ? "translateX(2px)" : "none" }} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compteurs de réactions ──────────────────────────────────────────── */

function ReactionBar({ post, onToggleComments, onOpenPost }) {
  const hasReactions = post.likes > 0 || post.comments.length > 0 || post.shares > 0;
  if (!hasReactions) return null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 16px", fontSize: 12, color: C.muted }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {post.likes > 0 && (
          <>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: goldGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ThumbsUp size={10} color={C.navy900} fill={C.navy900} />
            </span>
            <span>{fmtCount(post.likes)}</span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {post.comments.length > 0 && (
          <button
            onClick={() => onOpenPost ? onOpenPost(post) : onToggleComments()}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {post.comments.length} commentaire{post.comments.length > 1 ? "s" : ""}
          </button>
        )}
        {(post.shares || 0) > 0 && <span>{fmtCount(post.shares)} partage{post.shares > 1 ? "s" : ""}</span>}
      </div>
    </div>
  );
}

/* ── Texte du post avec expand ───────────────────────────────────────── */

const TEXT_COLLAPSE_THRESHOLD = 280;

function PostText({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > TEXT_COLLAPSE_THRESHOLD;
  const displayed = isLong && !expanded ? text.slice(0, TEXT_COLLAPSE_THRESHOLD) + "…" : text;

  return (
    <div style={{ padding: "0 16px 10px", fontSize: 15, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {displayed}
      {isLong && (
        <button
          onClick={() => setExpanded((s) => !s)}
          style={{ background: "none", border: "none", padding: "0 0 0 6px", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 14 }}
        >
          {expanded ? "Voir moins" : "Voir plus"}
          <ChevronDown size={13} style={{ marginLeft: 3, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  POSTCARD — composant principal                                       */
/* ══════════════════════════════════════════════════════════════════════ */

export default function PostCard({
  post,
  currentUser = { name: "Vous", initials: "V", avatarUrl: null },
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onReplyComment,
  onShare,
  onOpenArticle,
  onOpenPost,
  onDelete,
  isOwn = false,
}) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [justShared, setJustShared]     = useState(false);

  const mediaItems = normalizeMedia(post.media);

  const handleShare = () => {
    onShare?.(post.id);
    setJustShared(true);
    setTimeout(() => setJustShared(false), 1800);
  };

  const toggleComments = () => setShowComments((s) => !s);

  // Fermer le menu si on clique ailleurs
  const menuRef = useRef(null);
  const handleDocClick = useCallback((e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false);
      document.removeEventListener("click", handleDocClick);
    }
  }, []);

  const openMenu = () => {
    setMenuOpen(true);
    setTimeout(() => document.addEventListener("click", handleDocClick), 0);
  };

  return (
    <>
      {/* Styles utilitaires injectés une seule fois via un id */}
      <style>{`
        @media (max-width: 480px) {
          .pc-action-label { display: none; }
        }
      `}</style>

      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          overflow: "visible",
          boxShadow: "0 1px 4px rgba(15,51,82,0.06)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "16px 16px 10px" }}>
          <Avatar initials={post.initials} size={44} imgUrl={post.avatarUrl} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {post.author}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {post.title}
            </div>
            <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <RelativeTime date={post.time} />
              <span>·</span>
              <VisibilityIcon v={post.visibility} />
              {post.isArticle && (
                <>
                  <span>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: C.gold600, fontWeight: 600 }}>
                    <BookOpen size={11} /> Article
                  </span>
                  <span>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={10} />
                    {(post.readingTime ?? readingTime(post.body || post.text || ""))} min de lecture
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions header */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {post.isArticle && onOpenArticle && (
              <button
                onClick={() => onOpenArticle(post)}
                title="Lire l'article"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.color = C.gold600; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.mutedLight; }}
              >
                <BookOpen size={15} />
              </button>
            )}
            {!post.isArticle && onOpenPost && (
              <button
                onClick={() => onOpenPost(post)}
                title="Ouvrir la publication"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.color = C.navy800; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.mutedLight; }}
              >
                <ExternalLink size={15} />
              </button>
            )}

            {/* Menu "…" */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={openMenu}
                title="Plus d'options"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.color = C.navy800; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.mutedLight; }}
              >
                <MoreHorizontal size={17} />
              </button>
              {menuOpen && (
                <ContextMenu
                  isOwn={isOwn}
                  onDelete={() => onDelete?.(post.id)}
                  onOpenPost={!post.isArticle && onOpenPost ? () => onOpenPost(post) : null}
                  onOpenArticle={post.isArticle && onOpenArticle ? () => onOpenArticle(post) : null}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Contenu ────────────────────────────────────────────────── */}
        {post.isArticle
          ? <ArticleBanner post={post} onOpenArticle={onOpenArticle} />
          : (
            <>
              <PostText text={post.text} />
              {mediaItems.length > 0 && (
                <div style={{ padding: "0 0 4px" }}>
                  <MediaGallery items={mediaItems} onOpenPost={onOpenPost ? () => onOpenPost(post) : null} />
                </div>
              )}
            </>
          )
        }

        {/* ── Compteurs ─────────────────────────────────────────────── */}
        <ReactionBar post={post} onToggleComments={toggleComments} onOpenPost={onOpenPost} />

        {/* ── Séparateur ────────────────────────────────────────────── */}
        <div style={{ height: 1, background: C.line, margin: "0 16px" }} />

        {/* ── Barre d'actions ───────────────────────────────────────── */}
        <ActionBar
          post={post}
          onToggleLike={onToggleLike}
          onToggleBookmark={onToggleBookmark}
          onShare={handleShare}
          onToggleComments={toggleComments}
          onOpenArticle={onOpenArticle}
          justShared={justShared}
        />

        {/* ── Section commentaires (dépliable) ─────────────────────── */}
        {/* Pour les articles, les commentaires sont gérés dans ArticleViewerPreview */}
        {showComments && !post.isArticle && (
          <CommentSection
            post={post}
            currentUser={currentUser}
            onAddComment={onAddComment}
            onReplyComment={onReplyComment}
          />
        )}
      </div>
    </>
  );
}
