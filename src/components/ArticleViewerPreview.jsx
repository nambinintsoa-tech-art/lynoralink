"use client";

/**
 * ArticleViewerPreview.jsx — LynoraLink
 * ──────────────────────────────────────
 * Visionneuse complète d'un article longue-forme.
 *
 * Props
 * ─────
 * @prop {object}   article          Objet article complet (voir shape ci-dessous)
 * @prop {object}   currentUser      { name, initials, avatarUrl }
 * @prop {function} onClose          Ferme la visionneuse
 * @prop {function} onToggleLike     (id) => void
 * @prop {function} onToggleBookmark (id) => void
 * @prop {function} onAddComment     (id, text) => void
 * @prop {function} onShare          (id) => void
 * @prop {function} [onFollowAuthor] (authorId) => void   — optionnel
 *
 * Article shape
 * ─────────────
 * {
 *   id, headline, excerpt, body, author, initials, avatarUrl,
 *   title (poste auteur), time, readingTime (minutes, auto-calculé si absent),
 *   coverUrl, likes, liked, bookmarked, bookmarks, shares, comments: [{ id, author, initials, avatarUrl, text, time }],
 *   tags: string[], isArticle: true
 * }
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, ThumbsUp, Share2, Bookmark, MessageCircle, Send,
  Clock, Globe, BookOpen, MoreHorizontal, UserPlus, Check,
  Eye, ChevronUp, Tag,
} from "lucide-react";
import LogoBadge from "./LogoBadge";
import RelativeTime from "./RelativeTime";
import ReactionPicker from "./ReactionPicker";
import ProfileHoverPreview from "./ProfileHoverPreview";
import { ShareModal as PostShareModal } from "./PostViewerPreview";

/* ─────────────────────────────────────────────
   TOKENS — palette LynoraLink
───────────────────────────────────────────── */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy100: "#DCE7F1",
  navy50:  "#EFF4F9",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink:     "#132433",
  muted:   "#5C7488",
  mutedLight: "#8CA0B3",
  line:    "#E3EAF1",
  white:   "#FFFFFF",
  success50: "#EBF7F0",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const REACTIONS = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png" },
  { key: "love", label: "Love", src: "/emoji_picker/love.png" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png" },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png" },
  { key: "colere", label: "Colère", src: "/emoji_picker/colere.png" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png" },
];
const REACTION_KEY_ALIASES = { like: "ok", j_aime: "ok", "j'aime": "ok" };
function normalizeReactionKey(key) {
  return REACTION_KEY_ALIASES[String(key || "").trim().toLowerCase()] || String(key || "").trim().toLowerCase();
}
const reactionByKey = (key) => REACTIONS.find((reaction) => reaction.key === key);

function getArticleReactionTypes(article) {
  const reactions = article.reactions && typeof article.reactions === "object" ? article.reactions : {};
  const normalized = Object.fromEntries(
    Object.entries(reactions).map(([key, value]) => {
      const ids = Array.isArray(value) ? value : Array.isArray(value?.userIds) ? value.userIds : [];
      return [String(key).trim().toLowerCase(), ids];
    })
  );
  const selected = normalizeReactionKey(article.reaction || article.userReaction || null);
  const ordered = Object.entries(normalized)
    .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
    .sort(([, first], [, second]) => second.length - first.length)
    .map(([key]) => normalizeReactionKey(key));

  const keys = [...new Set([selected, ...ordered].filter(Boolean))].slice(0, 3);
  const types = keys.map((key) => reactionByKey(key)).filter(Boolean);
  return types.length > 0 || Number(article.likes || 0) === 0 ? types : [REACTIONS[0]];
}

function getArticleReactionCount(article) {
  const reactions = article.reactions && typeof article.reactions === "object" ? article.reactions : {};
  const total = Object.values(reactions).reduce((sum, count) => sum + (Array.isArray(count) ? count.length : Array.isArray(count?.userIds) ? count.userIds.length : Number(count || 0)), 0);
  return total || Number(article.likes || 0);
}

function ArticleReactionIcon({ reaction, size = 18 }) {
  return <img src={reaction.src} alt={reaction.label} style={{ width: size, height: size, objectFit: "contain", borderRadius: 5 }} />;
}

/* ─────────────────────────────────────────────
   UTILITAIRES — lecture / rendu Markdown léger
───────────────────────────────────────────── */
function readingTime(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeArticleMarkdown(raw = "") {
  return String(raw)
    .replace(/<span\b[^>]*?style\s*=\s*["'][^"']*["']?/gi, "")
    .replace(/<\/?span\b[^>]*>?/gi, "")
    .replace(/<\/?(?:u|s|del|strike|mark)\b[^>]*>?/gi, "")
    .replace(/(^|\n)\s*>\s?/g, "$1")
    .replace(/\*{3,}/g, "")
    .replace(/(^|\n)\s*\*{2}(?=\S)/g, "$1")
    .replace(/\*{2}\s*(?=\n|$)/g, "")
    .replace(/(^|\n)\s*\*(?=\S)/g, "$1")
    .replace(/\*\s*(?=\n|$)/g, "")
    .replace(/(^|\n)\s*<\/?[a-z][^>]*>?/gi, "$1");
}

function parseArticleBody(raw) {
  if (!raw) return [];
  return normalizeArticleMarkdown(raw)
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.startsWith("# "))  return { type: "h1",    text: chunk.slice(2) };
      if (chunk.startsWith("## ")) return { type: "h2",    text: chunk.slice(3) };
      if (chunk.startsWith("> "))  return { type: "quote", text: chunk.replace(/^>\s?/gm, "") };
      const lines = chunk.split("\n");
      if (lines.length > 0 && lines.every((l) => l.trim().startsWith("- ")))
        return { type: "list", items: lines.map((l) => l.trim().slice(2)) };
      if (lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l.trim())))
        return { type: "olist", items: lines.map((l) => l.trim().replace(/^\d+\.\s/, "")) };
      return { type: "paragraph", text: chunk };
    });
}

function inlineFormat(str) {
  const cleanText = String(str)
    .replace(/<\/?(?:u|s|del|strike|mark)(?:\s[^>]*)?>/gi, "")
    .replace(/&lt;span\b[^&]*?style\s*=\s*["']?color\s*:\s*[^"'>&\s]+["']?/gi, "")
    .replace(/<span\b[^>]*?style\s*=\s*["']?color\s*:\s*[^"'>\s]+["']?/gi, "")
    .replace(/&lt;span\b[^&]*?(?:&gt;|>)/gi, "")
    .replace(/<span\b[^>]*>/gi, "")
    .replace(/&lt;\/span\b[^&]*?(?:&gt;|>)/gi, "")
    .replace(/<\/span\b[^>]*>?/gi, "")
    .replace(/&lt;\/span&gt;|<\/span>/gi, "")
    .replace(/<span\b[^>]*$/gi, "")
    .replace(/&lt;span\b[^&]*$/gi, "");
  const nodes = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)(?:\{width=(25%|50%|75%|100%) align=(left|center|right)\})?|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  let lastIndex = 0, match, key = 0;
  while ((match = regex.exec(cleanText))) {
    if (match.index > lastIndex) nodes.push(cleanText.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      const src = match[2].trim();
      const width = match[3] || "100%";
      const align = match[4] || "left";
      const isSafeImage = /^(https?:\/\/|data:image\/)/i.test(src);
      nodes.push(isSafeImage ? <img key={key++} src={src} alt={match[1]} style={{ display: "block", width, maxWidth: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 12, margin: align === "right" ? "18px 0 18px auto" : align === "center" ? "18px auto" : "18px 0", background: C.navy50 }} /> : match[0]);
    }
    else if (match[5] !== undefined) {
      const href = match[6].trim();
      const isSafeHref = /^(https?:\/\/|mailto:|\/[A-Za-z0-9])/.test(href);
      nodes.push(isSafeHref
        ? <a key={key++} href={href} target="_blank" rel="noreferrer" style={{ color: C.navy800, fontWeight: 600, textDecoration: "underline" }}>{match[5]}</a>
        : match[5]);
    }
    else if (match[7] !== undefined)
      nodes.push(<strong key={key++} style={{ fontWeight: 700, color: C.ink }}>{match[7]}</strong>);
    else if (match[8] !== undefined)
      nodes.push(<em key={key++}>{match[8]}</em>);
    else if (match[9] !== undefined)
      nodes.push(<code key={key++} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88em", background: C.navy50, color: C.navy800, padding: "1px 5px", borderRadius: 4 }}>{match[9]}</code>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleanText.length) nodes.push(cleanText.slice(lastIndex));
  return nodes;
}

function formatLines(text) {
  return text.split("\n").map((line, i, arr) => (
    <React.Fragment key={i}>{inlineFormat(line)}{i < arr.length - 1 && <br />}</React.Fragment>
  ));
}

function ArticleBlocks({ blocks, presentation = {} }) {
  if (!blocks.length)
    return <p style={{ color: C.mutedLight, fontStyle: "italic" }}>Contenu de l'article indisponible.</p>;

  const bodyFont = presentation.font === "modern" ? "'Sora', sans-serif" : presentation.font === "compact" ? "'Trebuchet MS', sans-serif" : "Georgia, serif";
  const bodyLineHeight = presentation.density === "dense" ? 1.55 : presentation.density === "balanced" ? 1.7 : 1.9;

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "h1")
          return <h2 key={i} style={{ fontFamily: bodyFont, fontWeight: 800, fontSize: 24, color: C.ink, margin: "32px 0 14px", lineHeight: 1.3 }}>{formatLines(b.text)}</h2>;
        if (b.type === "h2")
          return <h3 key={i} style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 19, color: C.ink, margin: "26px 0 11px", lineHeight: 1.35 }}>{formatLines(b.text)}</h3>;
        if (b.type === "quote")
          return (
            <blockquote key={i} style={{ margin: "24px 0", padding: "14px 20px 14px 22px", borderLeft: `4px solid ${C.gold600}`, background: C.navy50, borderRadius: "0 12px 12px 0", color: C.navy800, fontStyle: "italic", fontSize: 16.5, lineHeight: 1.7 }}>
              {formatLines(b.text)}
            </blockquote>
          );
        if (b.type === "list")
          return (
            <ul key={i} style={{ margin: "0 0 22px", paddingLeft: 26, color: C.ink, fontSize: 16, lineHeight: 1.85 }}>
              {b.items.map((item, j) => <li key={j} style={{ marginBottom: 6 }}>{formatLines(item)}</li>)}
            </ul>
          );
        if (b.type === "olist")
          return (
            <ol key={i} style={{ margin: "0 0 22px", paddingLeft: 26, color: C.ink, fontSize: 16, lineHeight: 1.85 }}>
              {b.items.map((item, j) => <li key={j} style={{ marginBottom: 6 }}>{formatLines(item)}</li>)}
            </ol>
          );
        return (
            <p key={i} style={{ margin: "0 0 22px", fontSize: 16.5, lineHeight: bodyLineHeight, color: C.ink, fontFamily: bodyFont }}>
            {formatLines(b.text)}
          </p>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   SOUS-COMPOSANTS
───────────────────────────────────────────── */
function Avatar({ initials, size = 44, imgUrl = null, ring = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: imgUrl ? C.navy100 : navyGrad,
      color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36, fontFamily: "'Sora', sans-serif",
      flexShrink: 0, overflow: "hidden",
      border: ring ? `2.5px solid ${C.white}` : "none",
      boxShadow: ring ? `0 0 0 3px ${C.gold600}` : "none",
      letterSpacing: "-0.02em",
    }}>
      {imgUrl ? <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, active, activeColor = C.navy800, count }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "10px 6px", borderRadius: 10, border: "none",
        background: hovered ? C.navy50 : "transparent",
        cursor: "pointer", fontSize: 13, fontWeight: 600,
        color: active ? activeColor : hovered ? C.ink : C.muted,
        transition: "background 0.15s ease, color 0.15s ease",
        userSelect: "none",
      }}
    >
      <Icon
        size={17}
        fill={active ? activeColor : "none"}
        strokeWidth={active ? 2.2 : 1.8}
        style={{ transition: "fill 0.15s ease, color 0.15s ease" }}
      />
      <span className="article-action-label">{label}</span>
      {count !== undefined && (
        <span className="article-action-count" style={{ fontSize: 11, color: C.mutedLight, fontWeight: 500 }}>({count})</span>
      )}
    </button>
  );
}

function ArticleReactionAction({ article, onToggleLike, onSelectReaction }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const reaction = article.reaction || (article.liked ? "ok" : null);
  const selectedReaction = reactionByKey(reaction);
  const closeLater = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 220);
  };
  return (
    <div
      style={{ position: "relative", flex: 1 }}
      onMouseEnter={() => { clearTimeout(closeTimer.current); setOpen(true); }}
      onMouseLeave={closeLater}
    >
      {open && (
        <div onMouseEnter={() => clearTimeout(closeTimer.current)} onMouseLeave={closeLater} style={{ position: "absolute", bottom: "100%", left: 0, zIndex: 20, paddingBottom: 6 }}>
          <ReactionPicker selectedKey={reaction} onSelect={(key) => { onSelectReaction?.(article.id, key); setOpen(false); }} size={42} imgSize={30} />
        </div>
      )}
      <ActionBtn
        icon={selectedReaction ? () => <ArticleReactionIcon reaction={selectedReaction} size={18} /> : ThumbsUp}
        label={selectedReaction?.label || "J'aime"}
        active={Boolean(reaction)}
        activeColor={C.gold600}
        onClick={() => onToggleLike?.(article.id)}
      />
    </div>
  );
}

function CommentItem({ comment, onToggleCommentReaction, onReply, postAuthorId, depth = 0 }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReaction, setLocalReaction] = useState(comment.reaction || null);
  const [showReplies, setShowReplies] = useState(false);
  const reactionRef = useRef(null);
  const closeTimer = useRef(null);
  const selectReaction = async (key) => {
    const next = localReaction === key ? null : key;
    setLocalReaction(next);
    setShowReactionPicker(false);
    await onToggleCommentReaction?.(comment.id, key);
  };
  return (
    <div style={{ display: "flex", gap: 10, marginLeft: depth * 34 }}>
      <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || comment.authorId) : comment.authorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}>
        <Avatar initials={comment.initials} size={34} imgUrl={comment.avatarUrl} />
      </ProfileHoverPreview>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: C.navy50, border: `1px solid ${C.line}`,
          borderRadius: "4px 16px 16px 16px", padding: "10px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || comment.authorId) : comment.authorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{comment.author}</span>
            </ProfileHoverPreview>
            {String(comment.authorId) === String(postAuthorId) && <span title="Auteur de l'article" style={{ color: C.navy800, background: C.navy50, border: `1px solid ${C.navy100}`, borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>Auteur</span>}
            {comment.authorTitle && (
              <span style={{ fontSize: 11.5, color: C.muted }}>{comment.authorTitle}</span>
            )}
          </div>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6 }}>{comment.text}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: C.mutedLight, marginTop: 4, paddingLeft: 4 }}>
          <RelativeTime date={comment.time} />
          <div ref={reactionRef} style={{ position: "relative" }} onMouseEnter={() => { clearTimeout(closeTimer.current); setShowReactionPicker(true); }} onMouseLeave={() => { closeTimer.current = window.setTimeout(() => setShowReactionPicker(false), 180); }}>
            <button type="button" onClick={() => selectReaction("ok")} style={{ border: "none", background: "transparent", padding: 0, color: localReaction ? C.gold600 : C.muted, fontWeight: 700, cursor: "pointer" }}>
              {reactionByKey(localReaction)?.label || "J'aime"}
            </button>
            {showReactionPicker && <div onMouseEnter={() => clearTimeout(closeTimer.current)} style={{ position: "absolute", bottom: "100%", left: 0, paddingBottom: 6, zIndex: 20 }}><ReactionPicker selectedKey={localReaction} onSelect={selectReaction} size={40} imgSize={28} /></div>}
          </div>
          {(comment.totalReactions || 0) > 0 && <span>{comment.totalReactions}</span>}
          {comment.replies?.length > 0 && <button type="button" onClick={() => setShowReplies((open) => !open)} style={{ border: "none", background: "transparent", padding: 0, color: C.navy800, fontWeight: 700, cursor: "pointer" }}>{showReplies ? "Masquer les réponses" : `Voir les ${comment.replies.length} réponse${comment.replies.length > 1 ? "s" : ""}`}</button>}
          {onReply && <button type="button" onClick={() => onReply(comment)} style={{ border: "none", background: "transparent", padding: 0, color: C.muted, fontWeight: 700, cursor: "pointer" }}>Répondre</button>}
        </div>
        {showReplies && comment.replies?.map((reply) => <CommentItem key={reply.id} comment={reply} onToggleCommentReaction={onToggleCommentReaction} onReply={onReply} postAuthorId={postAuthorId} depth={depth + 1} />)}
      </div>
    </div>
  );
}

/* Barre de progression de lecture */
function ReadingProgressBar({ containerRef }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const pct = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: C.navy100 }}>
      <div style={{ height: "100%", width: `${progress}%`, background: goldGrad, transition: "width 0.1s linear" }} />
    </div>
  );
}

/* Bouton "Retour en haut" */
function BackToTopBtn({ containerRef, visible }) {
  return visible ? (
    <button
      onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 90,
        width: 42, height: 42, borderRadius: "50%", border: "none",
        background: navyGrad, color: C.white,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(15,51,82,0.28)", cursor: "pointer",
        transition: "opacity 0.2s ease",
      }}
      title="Retour en haut"
    >
      <ChevronUp size={20} />
    </button>
  ) : null;
}

/* ─────────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────────── */
export default function ArticleViewerPreview({
  article,
  currentUser = { name: "Vous", initials: "V", avatarUrl: null },
  onClose,
  onToggleLike,
  onSelectReaction,
  onToggleBookmark,
  onAddComment,
  onReplyComment,
  onToggleCommentReaction,
  onShare,
  onFollowAuthor,
}) {
  const [commentDraft, setCommentDraft]   = useState("");
  const [showShare, setShowShare]         = useState(false);
  const [following, setFollowing]         = useState(false);
  const [showBackTop, setShowBackTop]     = useState(false);
  const [replyingTo, setReplyingTo]       = useState(null);
  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);

  const minutes = article.readingTime ?? readingTime(article.body || "");
  const blocks  = parseArticleBody(article.body || "");
  const presentation = article.presentation || {};
  const articleTheme = {
    "navy-gold": C.navy800,
    forest: "#24594A",
    coral: "#B75245",
    ocean: "#176A83",
  }[presentation.theme] || C.navy800;
  const articleFont = presentation.font === "modern" ? "'Sora', sans-serif" : presentation.font === "compact" ? "'Trebuchet MS', sans-serif" : "Georgia, serif";
  const reactionCount = getArticleReactionCount(article);
  const coverUrl = article.coverUrl || presentation.coverUrl || null;
  const articleIsPage = article.authorType === "page" || Boolean(article.companyPageId);
  const articleIdentityId = article.companyPageId || article.authorId;

  /* Scroll → bouton back-to-top */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setShowBackTop(el.scrollTop > 400);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  /* ESC → fermeture */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const submitComment = useCallback(async () => {
    const text = commentDraft.trim();
    if (!text) return;
    if (replyingTo) {
      await onReplyComment?.(article.id, replyingTo.id, text);
      setReplyingTo(null);
    } else {
      await onAddComment?.(article.id, text);
    }
    setCommentDraft("");
  }, [commentDraft, article.id, onAddComment, onReplyComment, replyingTo]);

  const handleFollowAuthor = () => {
    setFollowing((v) => !v);
    onFollowAuthor?.(article.authorId);
  };

  return (
    <>
      {/* ── OVERLAY FOND ── */}
      <div className="article-viewer-overlay" style={{ position: "fixed", inset: 0, background: C.navy50, zIndex: 1100, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── TOPBAR STICKY ── */}
        <div className="article-viewer-topbar" style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}`, zIndex: 10 }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", position: "relative" }}>
            <button
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 6, background: C.navy50, border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 13px", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 12.5, flexShrink: 0, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.navy100)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.navy50)}
            >
              <ArrowLeft size={14} />
              Retour au fil
            </button>

            <div className="article-topbar-title" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {article.headline}
              </div>
            </div>

            {/* Contexte de lecture, sans actions sociales dans l'en-tête */}
            <div className="article-reading-context" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, padding: "6px 10px", borderLeft: `1px solid ${C.line}`, color: C.muted }}>
              <BookOpen size={15} color={C.navy800} strokeWidth={1.8} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.15 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.navy800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Lecture</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>{minutes} min · format long</span>
              </div>
            </div>

            <LogoBadge size={30} />

            {/* Barre de progression lecture */}
            <ReadingProgressBar containerRef={scrollRef} />
          </div>
        </div>

        {/* ── CORPS DE L'ARTICLE ── */}
        <div className="article-viewer-content" style={{ width: "100%", flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden" }} ref={scrollRef}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 100px" }}>

          {/* Label catégorie */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "32px 0 14px" }}>
            <BookOpen size={13} color={articleTheme} />
            <span style={{ fontSize: 11, fontWeight: 700, color: articleTheme, letterSpacing: "0.08em", textTransform: "uppercase" }}>Article</span>
          </div>

          {/* Titre principal */}
          <h1 style={{ fontFamily: articleFont, fontWeight: 900, fontSize: "clamp(24px, 4.5vw, 38px)", lineHeight: 1.22, color: articleTheme, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            {article.headline}
          </h1>

          {/* Extrait / sous-titre */}
          {article.excerpt && (
            <p style={{ fontSize: 17.5, color: C.muted, lineHeight: 1.65, margin: "0 0 28px", fontStyle: "italic", borderLeft: `3px solid ${C.line}`, paddingLeft: 16 }}>
              {article.excerpt}
            </p>
          )}

          {/* Auteur + méta */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 0", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, marginBottom: 28 }}>
            <ProfileHoverPreview type={articleIsPage ? "page" : "person"} fallback={{ id: articleIdentityId, name: article.author, avatarUrl: article.avatarUrl, coverUrl: article.coverUrl, bio: article.bio, location: article.location, followersCount: article.followersCount }}>
              <Avatar initials={article.initials} size={52} imgUrl={article.avatarUrl} />
            </ProfileHoverPreview>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProfileHoverPreview type={articleIsPage ? "page" : "person"} fallback={{ id: articleIdentityId, name: article.author, avatarUrl: article.avatarUrl, coverUrl: article.coverUrl, bio: article.bio, location: article.location, followersCount: article.followersCount }}>
                <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>{article.author}</div>
              </ProfileHoverPreview>
              {article.title && (
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{article.title}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap", fontSize: 11.5, color: C.mutedLight }}>
                <RelativeTime date={article.time} />
                <span style={{ color: C.line }}>·</span>
                <Clock size={11} color={C.mutedLight} />
                <span>{minutes} min de lecture</span>
                <span style={{ color: C.line }}>·</span>
                <Globe size={11} color={C.mutedLight} />
                <span>Public</span>
              </div>
            </div>

            {/* Bouton Suivre l'auteur */}
            {onFollowAuthor && (
              <button
                onClick={handleFollowAuthor}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 10, border: `1.5px solid ${following ? C.line : C.navy800}`,
                  background: following ? C.navy50 : "transparent",
                  color: following ? C.muted : C.navy800,
                  fontWeight: 700, fontSize: 12.5, cursor: "pointer", flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {following ? <Check size={13} /> : <UserPlus size={13} />}
                {following ? "Suivi" : "Suivre"}
              </button>
            )}
          </div>

          {/* Image de couverture */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={article.headline}
              style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 16, marginBottom: 32, display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", height: 240, borderRadius: 16, marginBottom: 32,
              background: navyGrad, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <BookOpen size={46} color={C.gold400} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Article LynoraLink</span>
            </div>
          )}

          {/* Corps de l'article */}
          <div style={{ fontFamily: articleFont, color: C.ink }}>
            <ArticleBlocks blocks={blocks} presentation={presentation} />
          </div>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "32px 0 0" }}>
              {article.tags.map((tag) => (
                <span key={tag} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, background: C.navy50, border: `1px solid ${C.line}`, fontSize: 12, fontWeight: 600, color: C.navy700 }}>
                  <Tag size={11} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* ── SECTION ACTIONS ── */}
          <div className="article-action-section" style={{ margin: "32px 0 0", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>

            {/* Compteurs */}
            <div className="article-engagement-status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 2px", fontSize: 12.5, color: C.muted }}>
              <div className="article-engagement-reactions" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {reactionCount > 0 && (
                  <>
                      <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: 2, flexShrink: 0 }} aria-label="Réactions">
                        {getArticleReactionTypes(article).map((item, index) => (
                          <span key={item.key} style={{ display: "inline-flex", marginLeft: index === 0 ? 0 : -6, zIndex: 3 - index, width: 22, height: 22, borderRadius: "50%", border: `2px solid ${C.white}`, background: C.navy50, alignItems: "center", justifyContent: "center" }}>
                            <ArticleReactionIcon reaction={item} size={15} />
                          </span>
                        ))}
                      </span>
                    <span style={{ fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{reactionCount} {reactionCount > 1 ? "réactions" : "réaction"}</span>
                  </>
                )}
                {reactionCount === 0 && <span style={{ color: C.mutedLight }}>Aucune réaction</span>}
              </div>
              <div className="article-engagement-counts" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, textAlign: "right" }}>
                {article.comments?.length >= 0 && (
                  <span className="article-stat-item">
                    <strong style={{ color: C.ink }}>{article.comments?.length || 0}</strong>{" "}
                    commentaire{article.comments?.length > 1 ? "s" : ""}
                  </span>
                )}
                {Number(article.shares) >= 0 && (
                  <span className="article-stat-item">
                    <strong style={{ color: C.ink }}>{Number(article.shares) || 0}</strong> partage{Number(article.shares) > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Boutons d'action principaux */}
            <div className="article-action-row" style={{ display: "flex", padding: "6px 0 8px", borderTop: `1px solid ${C.line}` }}>
              <ArticleReactionAction article={article} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} />
              <ActionBtn
                icon={MessageCircle}
                label="Commenter"
                count={article.comments?.length || 0}
                onClick={() => inputRef.current?.focus()}
              />
              <ActionBtn
                icon={Share2}
                label="Partager"
                count={article.shares || 0}
                onClick={() => setShowShare(true)}
              />
              <ActionBtn
                icon={Bookmark}
                label="Enregistrer"
                active={article.bookmarked}
                activeColor={C.navy800}
                count={article.bookmarks ?? 0}
                onClick={() => onToggleBookmark?.(article.id)}
              />
            </div>
          </div>

          {/* ── SECTION COMMENTAIRES ── */}
          <div className="article-comments-section" style={{ marginTop: 28 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 18 }}>
              {!article.comments?.length
                ? "Commentaires"
                : `${article.comments.length} commentaire${article.comments.length > 1 ? "s" : ""}`}
            </div>

            {/* Champ de saisie commentaire */}
            <div className="article-comment-composer" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24 }}>
              <Avatar initials={currentUser.initials} size={36} imgUrl={currentUser.avatarUrl} />
              <div style={{
                flex: 1, display: "flex", alignItems: "center",
                background: C.white, border: `1.5px solid ${C.line}`,
                borderRadius: 999, padding: "4px 5px 4px 16px",
                transition: "border-color 0.15s ease",
              }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = C.navy700)}
                onBlurCapture={(e)  => (e.currentTarget.style.borderColor = C.line)}
              >
                <input
                  ref={inputRef}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder={replyingTo ? `Répondre à ${replyingTo.author}...` : "Ajouter un commentaire..."}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: C.ink, fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!commentDraft.trim()}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", border: "none",
                    background: commentDraft.trim() ? navyGrad : C.line,
                    color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: commentDraft.trim() ? "pointer" : "default",
                    flexShrink: 0, transition: "background 0.15s ease",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

            {/* Liste des commentaires */}
            {!article.comments?.length ? (
              <div style={{
                padding: "28px 20px", borderRadius: 16, border: `1px dashed ${C.line}`,
                background: C.navy50, textAlign: "center",
              }}>
                <MessageCircle size={28} color={C.mutedLight} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13.5, color: C.muted, fontWeight: 600 }}>Aucun commentaire pour le moment</div>
                <div style={{ fontSize: 12.5, color: C.mutedLight, marginTop: 4 }}>Soyez le premier à commenter cet article.</div>
              </div>
            ) : (
              <div className="article-comments-list" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {article.comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postAuthorId={article.authorId}
                    onReply={setReplyingTo}
                    onToggleCommentReaction={(commentId, reaction) => onToggleCommentReaction?.(article.id, commentId, reaction)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── CARTE AUTEUR EN PIED ── */}
          <div style={{
            marginTop: 48, padding: "24px", borderRadius: 20,
            background: C.white, border: `1px solid ${C.line}`,
            boxShadow: "0 2px 16px rgba(15,51,82,0.07)",
          }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              À propos de l'auteur
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ProfileHoverPreview type={articleIsPage ? "page" : "person"} fallback={{ id: articleIdentityId, name: article.author, avatarUrl: article.avatarUrl, coverUrl: article.coverUrl, bio: article.bio, location: article.location, followersCount: article.followersCount }}>
                <Avatar initials={article.initials} size={58} imgUrl={article.avatarUrl} ring />
              </ProfileHoverPreview>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProfileHoverPreview type={articleIsPage ? "page" : "person"} fallback={{ id: articleIdentityId, name: article.author, avatarUrl: article.avatarUrl, coverUrl: article.coverUrl, bio: article.bio, location: article.location, followersCount: article.followersCount }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink }}>{article.author}</div>
                </ProfileHoverPreview>
                {article.title && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{article.title}</div>}
                {article.bio && <div style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 1.55 }}>{article.bio}</div>}
              </div>
              {onFollowAuthor && (
                <button
                  onClick={handleFollowAuthor}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                    borderRadius: 10, border: "none",
                    background: following ? C.navy50 : goldGrad,
                    color: following ? C.muted : C.navy900,
                    fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {following ? <Check size={14} /> : <UserPlus size={14} />}
                  {following ? "Suivi" : "Suivre"}
                </button>
              )}
            </div>
          </div>

        </div>
        </div>
        {/* /corps */}
      </div>
      {/* /overlay */}

      {/* ── MODALE PARTAGE ── */}
      {showShare && (
        <PostShareModal
          post={article}
          onClose={() => setShowShare(false)}
          onRepost={() => onShare?.(article.id)}
        />
      )}

      {/* Bouton retour en haut */}
      <BackToTopBtn containerRef={scrollRef} visible={showBackTop} />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .article-viewer-topbar { flex-shrink: 0; }
          .article-action-section {
          position: sticky;
          bottom: 0;
          z-index: 15;
          background: rgba(255,255,255,0.97);
          box-shadow: 0 -8px 18px rgba(15,51,82,0.08);
          backdrop-filter: blur(10px);
        }
        @media (max-width: 640px) {
          .article-viewer-overlay {
            width: 100vw !important;
            height: 100dvh !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
          .article-viewer-topbar {
            padding-top: env(safe-area-inset-top) !important;
          }
          .article-viewer-content {
            min-height: 0 !important;
            overscroll-behavior: contain !important;
          }
          .article-action-section {
            padding-bottom: env(safe-area-inset-bottom) !important;
          }
          .article-viewer-topbar > div {
            padding: 10px 12px !important;
          }
          .article-engagement-status {
            align-items: center !important;
            flex-direction: row !important;
            gap: 6px !important;
            padding: 10px 0 !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          .article-engagement-reactions,
          .article-engagement-counts {
            width: auto !important;
            min-width: 0 !important;
            flex-wrap: wrap !important;
          }
          .article-engagement-reactions {
            flex: 0 1 auto !important;
          }
          .article-engagement-counts {
            flex: 1 1 auto !important;
            justify-content: flex-end !important;
            gap: 6px !important;
            overflow: hidden !important;
          }
          .article-engagement-counts > span {
            white-space: nowrap !important;
          }
          .article-stat-item {
            font-size: 11px !important;
          }
          }
          .article-action-row {
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .article-action-row {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            align-items: stretch !important;
          }
          .article-action-row > * {
            min-width: 0 !important;
            width: 100% !important;
          }
          .article-action-row button {
            min-width: 0 !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            white-space: nowrap !important;
          }
          .article-action-row .article-action-label,
          .article-action-row .article-action-count {
            display: none !important;
          }
          .article-action-row > *,
          .article-action-row > * > button {
            height: 42px !important;
          }
          .article-action-row > * {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .article-action-row > * > button {
            width: 42px !important;
            min-width: 42px !important;
            padding: 0 !important;
            border-radius: 10px !important;
          }
          .article-topbar-title {
            overflow: hidden !important;
          }
          .article-topbar-actions {
            gap: 0 !important;
          }
          .article-comments-section {
            margin-top: 20px !important;
          }
          .article-comment-composer {
            align-items: stretch !important;
          }
          .article-comment-composer > div:nth-child(2) {
            min-width: 0 !important;
          }
          .article-share-modal {
            max-width: calc(100vw - 32px) !important;
            border-radius: 16px !important;
          }
          .article-comments-list {
            gap: 12px !important;
          }
          .avp-topbar-title,
          .article-topbar-title { display: none !important; }
        }
      `}</style>
    </>
  );
}

