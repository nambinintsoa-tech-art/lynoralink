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
import Link from "next/link";
import {
  ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal, UserPlus,
  Globe, Lock, Users, BookOpen, PlayCircle, Image as ImageIcon,
  Send, ExternalLink, X, Flag, EyeOff, Link2, Trash2, ChevronDown,
  ChevronUp, Clock, Tag, ArrowRight, CornerUpLeft, Pencil, CalendarDays,
  MapPin, Video, Download, FileText, Search, Check, Copy, Mail, Megaphone, Briefcase,
  Info,
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp, faLinkedin, faFacebook, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faThumbsUp, faFaceSmile } from '@fortawesome/free-solid-svg-icons';
import ReactionPicker from "@/components/ReactionPicker";
import Emojipicker from "@/components/Emojipicker";
import RelativeTime from "@/components/RelativeTime";
import EnterpriseBadge from "./EnterpriseBadge";
import PremiumBadge from "./PremiumBadge";
import { fetchBackendApi } from "@/lib/backend-api";
import CreatePostModal from "./CreatePostModal";
import { CommentSkeleton } from "@/components/Skeleton";
import ProfileHoverPreview from "./ProfileHoverPreview";

/* ── Tokens ──────────────────────────────────────────────────────────── */
const C = {
  navy900:    "var(--navy900)",
  navy800:    "var(--navy800)",
  navy700:    "#2C6BA0",
  navy100:    "#DCE7F1",
  navy50:     "var(--app-bg)",
  gold400:    "#F6D374",
  gold600:    "#D9A536",
  ink:        "var(--app-text)",
  muted:      "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line:       "var(--app-border)",
  white:      "var(--app-surface)",
  danger:     "#C24444",
  success:    "#2E9E5B",
};

const LI_HOVER = "#f3f6f8";
const LI_SECONDARY = "#666666";
const LI_TEXT = "#000000";
const LI_BORDER = "#e0e0e0";
const LINKEDIN_BLUE = "#0a66c2";

/* ── Tokens "rendu Facebook" (chrome de carte uniquement) ──────────────
 * Utilisés pour la taille, les espacements, les bordures et les états
 * hover de la carte / de la barre d'actions / du menu "…", à l'identique
 * du rendu d'une publication Facebook. Les couleurs d'accent (like actif,
 * dégradés or/marine, etc.) restent celles de la charte (C) pour ne pas
 * casser l'identité visuelle du reste de l'app.
 */
const FB = {
  border: "var(--app-border)",
  divider: "var(--app-border)",
  hover: "var(--app-bg)",
  hoverStrong: "var(--app-border)",
  text: "var(--app-text)",
  textSecondary: "var(--app-muted)",
  cardRadius: 8,
  cardShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 3px rgba(0,0,0,0.08)",
  menuShadow: "0 12px 28px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)",
  mediaBg: "var(--app-bg)",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const REACTION_OPTIONS = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png" },
  { key: "love", label: "Love", src: "/emoji_picker/love.png" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png" },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png" },
  { key: "colere", label: "Colère", src: "/emoji_picker/colere.png" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png" },
];
const REACTION_KEY_ALIASES = { like: "ok", j_aime: "ok", "j'aime": "ok" };
function normalizeReactionKey(key) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  return REACTION_KEY_ALIASES[normalizedKey] || normalizedKey;
}
const LIKE_REACTION = REACTION_OPTIONS.find((reaction) => reaction.key === "ok");

function ReactionIcon({ reaction = LIKE_REACTION, selected = false, size = 22 }) {
  return (
    <span
      style={{
        width: size + 10,
        height: size + 10,
        borderRadius: "50%",
        border: selected ? `2px solid ${C.gold600}` : `1px solid ${C.line}`,
        background: selected ? "rgba(217,165,54,0.18)" : "#F8FBFF",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img src={reaction.src} alt={reaction.label} style={{ width: size, height: size, objectFit: "contain", borderRadius: 6 }} />
    </span>
  );
}

function getEngagementReactions(post) {
  const counts = post.reactions;
  let keys = [];

  if (Array.isArray(counts)) {
    keys = counts
      .map((item) => typeof item === "string" ? item : item?.key || item?.reaction || item?.reactionKey || item?.type)
      .filter(Boolean);
  } else if (counts && typeof counts === "object") {
    keys = Object.entries(counts)
      .filter(([, count]) => Array.isArray(count) ? count.length > 0 : Number(count) > 0)
      .sort(([, first], [, second]) => (Array.isArray(second) ? second.length : Number(second)) - (Array.isArray(first) ? first.length : Number(first)))
      .map(([key]) => key);
  }

  keys = keys.map(normalizeReactionKey);
  const userReaction = normalizeReactionKey(post.reaction);
  if (keys.length === 0) return [userReaction || LIKE_REACTION.key];

  keys = [userReaction, ...keys].filter(Boolean);
  return [...new Set(keys)]
    .map((key) => REACTION_OPTIONS.find((reaction) => reaction.key === key))
    .filter(Boolean)
    .slice(0, 3);
}

function buildReactionSummary(reactions = {}, userId = null, fallbackReaction = null) {
  const normalized = Object.fromEntries(
    Object.entries(reactions || {}).map(([key, value]) => {
      if (Array.isArray(value)) return [normalizeReactionKey(key), [...value]];
      if (value && typeof value === "object") {
        const ids = Array.isArray(value.userIds)
          ? value.userIds
          : Array.isArray(value.ids)
            ? value.ids
            : [];
        return [normalizeReactionKey(key), [...ids]];
      }
      return [normalizeReactionKey(key), []];
    })
  );

  const userReaction = normalizeReactionKey(
    fallbackReaction ?? Object.entries(normalized).find(([, ids]) => Array.isArray(ids) && ids.includes(userId))?.[0] ?? null
  );

  const reactionKeys = Object.entries(normalized)
    .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
    .sort(([, first], [, second]) => second.length - first.length)
    .map(([key]) => normalizeReactionKey(key));

  const orderedKeys = [...new Set([userReaction, ...reactionKeys].filter(Boolean))].slice(0, 3);

  return {
    reactions: normalized,
    reaction: userReaction || null,
    liked: Boolean(userReaction),
    likes: Object.values(normalized).reduce((total, ids) => total + (Array.isArray(ids) ? ids.length : 0), 0),
    reactionKeys: orderedKeys,
  };
}

function getReactionCount(post) {
  const reactions = post.reactions;
  if (Array.isArray(reactions)) {
    const total = reactions.reduce((sum, item) => sum + (typeof item === "object" ? Number(item.count || 0) : 1), 0);
    return total || Number(post.likes || 0);
  }
  if (reactions && typeof reactions === "object") {
    const total = Object.values(reactions).reduce((sum, count) => sum + (Array.isArray(count) ? count.length : Number(count || 0)), 0);
    return total || Number(post.likes || 0);
  }
  return Number(post.likes || 0);
}

function decorateJobOfferComments(comments, userId) {
  return comments.map((comment) => {
    const reactions = comment.reactions && typeof comment.reactions === "object" ? comment.reactions : {};
    const reaction = Object.entries(reactions).find(([, ids]) => Array.isArray(ids) && ids.includes(userId))?.[0] || null;
    const reactionKeys = Object.entries(reactions).filter(([, ids]) => Array.isArray(ids) && ids.length > 0).sort(([, first], [, second]) => second.length - first.length).map(([key]) => key).slice(0, 3);
    const totalReactions = Object.values(reactions).reduce((total, ids) => total + (Array.isArray(ids) ? ids.length : 0), 0);
    return { ...comment, reaction, reactionKeys, totalReactions, replies: decorateJobOfferComments(comment.replies || [], userId) };
  });
}

/* ── Utilitaires ─────────────────────────────────────────────────────── */

/** Normalise media en tableau (rétro-compatibilité objet unique) */
function normalizeMedia(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function sponsoredTarget(post) {
  const rawWebsite = String(post.website || "").trim();
  if (rawWebsite) {
    try { return new URL(/^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`).toString(); } catch {}
  }
  const whatsapp = String(post.whatsapp || "").replace(/\D/g, "");
  return whatsapp ? `https://wa.me/${whatsapp}` : null;
}

function sponsoredActionLabel(post) {
  if (post?.objective === "conversions") return "S'inscrire";
  if (post?.objective === "clics" && sponsoredTarget({ website: post.website })) return "Visiter";
  if (post?.whatsapp && !sponsoredTarget({ website: post.website })) return "WhatsApp";
  return "Découvrir";
}

function SponsoredInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      <button
        type="button"
        aria-label="Pourquoi vois-je cette publicité ?"
        aria-expanded={isOpen}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) setIsOpen(false);
        }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 1, border: 0, background: "transparent", color: "inherit", cursor: "pointer", borderRadius: 4 }}
      >
        <Info size={13} />
      </button>
      {isOpen && (
        <span role="status" style={{ position: "absolute", zIndex: 10, top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: "min(230px, calc(100vw - 32px))", padding: "10px 12px", borderRadius: 8, background: C.navy800, color: "#fff", fontSize: 12, lineHeight: 1.4, fontWeight: 500, textAlign: "left", whiteSpace: "normal", boxShadow: "0 6px 18px rgba(15,51,82,0.22)" }}>
          Cette publication est sponsorisée par LynoraLink.
        </span>
      )}
    </span>
  );
}

function SponsoredDetails({ post, onOpenPost, onMessage }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const websiteUrl = sponsoredTarget({ website: post.website });
  const whatsappUrl = post.whatsapp ? `https://wa.me/${String(post.whatsapp).replace(/\D/g, "")}` : null;
  const trackClick = () => {
    if (post.campaignId) fetchBackendApi("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: post.campaignId, event: "click" }) }).catch(() => {});
  };
  const mediaItems = normalizeMedia(post.media);

  // --- Texte principal avec repli "Voir plus / Voir moins" ---
  const description = post.excerpt || post.campaignDescription || post.text || "";
  const descriptionLineCount = description.split("\n").length;
  const descriptionIsLong = description.length > TEXT_COLLAPSE_THRESHOLD || descriptionLineCount > TEXT_COLLAPSE_MAX_LINES;
  const descriptionPreview = descriptionIsLong
    ? truncateText(description, { charLimit: TEXT_COLLAPSE_THRESHOLD, lineLimit: TEXT_COLLAPSE_MAX_LINES }).truncated
    : description;
  const ellipsis = "\u2026";
  const displayedDescription = descriptionIsLong && !descriptionExpanded ? `${descriptionPreview}${ellipsis}` : description;

  // --- Headline + libelle CTA ---
  const headline = post.headline || post.campaignTitle || post.title || "";
  const ctaLabel = sponsoredActionLabel(post);

  // Nom de domaine affiche sous la headline (factatif).
  let displayDomain = "lynoralink.com";
  if (websiteUrl) {
    try { displayDomain = new URL(websiteUrl).hostname.replace(/^www\./, ""); } catch {}
  }

  // CTA principal -- identite navy/dore de LynoraLink :
  // fond dore (C.gold400), texte navy fonce (C.navy800), bordure doree.
  const ctaBaseStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "7px 14px", borderRadius: 7,
    border: `1px solid ${C.gold600}`, fontSize: 13, lineHeight: 1,
    fontWeight: 700, textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap",
    color: C.navy800, background: C.gold400,
    boxShadow: "0 1px 2px rgba(15,51,82,0.10)",
    transition: "background 160ms ease, filter 160ms ease, transform 160ms ease",
  };
  const CtaButton = websiteUrl ? (
    <a
      className="pc-sponsored-cta"
      href={websiteUrl}
      target="_blank"
      rel="noreferrer"
      onClick={trackClick}
      style={ctaBaseStyle}
    >{ctaLabel}</a>
  ) : (
    <button
      className="pc-sponsored-cta"
      type="button"
      onClick={() => { trackClick(); onOpenPost?.(post); }}
      style={ctaBaseStyle}
    >{ctaLabel}</button>
  );

  return (
    <div className="pc-sponsored-block" style={{ display: "flex", flexDirection: "column" }}>
      {/* Texte de la publicite (au-dessus de l'image, couleur texte normale,
          avec "Voir plus / Voir moins" pour les descriptions longues) */}
      {description && (
        <div className="pc-sponsored-text" style={{ padding: "0 16px 12px", color: FB.text, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {displayedDescription}
          {descriptionIsLong && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((value) => !value)}
              style={{
                display: descriptionExpanded ? "block" : "inline",
                marginTop: descriptionExpanded ? 6 : 0,
                marginLeft: descriptionExpanded ? 0 : 6,
                background: "none", border: "none", padding: 0, cursor: "pointer",
                color: C.navy800, fontWeight: 700, fontSize: 15,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              aria-expanded={descriptionExpanded}
            >
              {descriptionExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>
      )}

      {/* Image / video pleine largeur, sans encadre dore epais ni fond dore pale */}
      {mediaItems.length > 0 && (
        <MediaGallery items={mediaItems} onOpenPost={onOpenPost ? () => onOpenPost(post) : null} />
      )}

      {/* Ligne " headline + bouton CTA " facon Facebook, identite navy/dore */}
      <div className="pc-sponsored-linkrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", background: FB.hover, borderTop: `1px solid ${FB.divider}`, borderBottom: `1px solid ${FB.divider}` }}>
        {websiteUrl ? (
          <a className="pc-sponsored-linkinfo" href={websiteUrl} target="_blank" rel="noreferrer" onClick={trackClick} style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3, color: "inherit", textDecoration: "none" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline || "Publicite"}</span>
            <span style={{ fontSize: 12, color: FB.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "underline" }}>{displayDomain}</span>
          </a>
        ) : (
          <div className="pc-sponsored-linkinfo" style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline || "Publicite"}</span>
            <span style={{ fontSize: 12, color: FB.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayDomain}</span>
          </div>
        )}
        {CtaButton}
      </div>

      {/* Actions secondaires discretes (Message / WhatsApp) */}
      {(onMessage || whatsappUrl) && (
        <div className="pc-sponsored-secondary" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 12px" }}>
          {onMessage && (
            <button type="button" onClick={() => { trackClick(); onMessage(post); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${FB.divider}`, background: C.white, color: C.navy800, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <MessageCircle size={15} /> Message
            </button>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={trackClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${FB.divider}`, background: C.white, color: "#127A3D", fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
              <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function fmtCount(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".0", "")} k`;
  return String(n);
}

function countComments(comments = []) {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);
}

/** Estime la durée de lecture en minutes */
function readingTime(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function isEventPost(post) {
  return post?.isEvent || post?.type === "event" || Boolean(post?.event) || Boolean(post?.eventId && post?.date && post?.maxAttendees);
}

function isFilePost(post) {
  const fileTypes = ["file", "document", "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx"];
  return post?.isFile || fileTypes.includes(post?.type) || Boolean(post?.file || post?.attachment || post?.fileUrl || post?.fileName);
}

function formatEventDate(date) {
  if (!date) return "Date à définir";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function EventBanner({ post, onJoinEvent, onOpenEvent }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const event = post.event || post;
  const isOnline = event.type === "online";
  const attendees = Number(event.attendees || 0);
  const maxAttendees = Number(event.maxAttendees || 0);
  const isAttending = Boolean(event.attending || event.isAttending || event.attendeeIds?.includes(post.currentUserId));

  const handleJoin = async () => {
    if (!onJoinEvent || isSubmitting || (maxAttendees > 0 && attendees >= maxAttendees && !isAttending)) return;
    setIsSubmitting(true);
    try {
      await onJoinEvent(post, event, isAttending);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ margin: "0 16px 12px", border: `1px solid ${C.line}`, borderRadius: 0, overflow: "hidden", background: "#F7FAFC" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", background: navyGrad, color: C.white, borderRadius: 0 }}>
        <CalendarDays size={20} color={C.gold400} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Événement du groupe</span>
      </div>
      <div style={{ padding: "15px" }}>
        <h3 style={{ margin: "0 0 7px", color: C.ink, fontSize: 17, lineHeight: 1.3 }}>{event.title || "Événement"}</h3>
        {event.description && <p style={{ margin: "0 0 12px", color: C.muted, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{event.description}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, color: C.muted, fontSize: 12.5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={14} /> {formatEventDate(event.date)}</span>
          {event.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={14} /> {event.time}{event.duration ? ` · ${event.duration}` : ""}</span>}
          {event.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><>{isOnline ? <Video size={14} /> : <MapPin size={14} />}</> {event.location}</span>}
          {maxAttendees > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Users size={14} /> {attendees}/{maxAttendees} participant{attendees > 1 ? "s" : ""}</span>}
        </div>
        {onJoinEvent && (
          <button
            type="button"
            onClick={handleJoin}
            disabled={isSubmitting || (maxAttendees > 0 && attendees >= maxAttendees && !isAttending)}
            style={{ marginTop: 15, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", border: "none", borderRadius: 9, background: isAttending ? C.success : C.navy800, color: C.white, fontSize: 12.5, fontWeight: 700, cursor: isSubmitting ? "wait" : "pointer", opacity: isSubmitting || (maxAttendees > 0 && attendees >= maxAttendees && !isAttending) ? 0.65 : 1 }}
          >
            <Users size={14} /> {isSubmitting ? "Mise à jour..." : isAttending ? "Inscrit" : "Participer"}
          </button>
        )}
        {onOpenEvent && (
          <button type="button" onClick={() => onOpenEvent(post)} style={{ marginTop: 15, marginLeft: 8, padding: "9px 15px", border: `1px solid ${C.navy800}`, borderRadius: 9, background: C.white, color: C.navy800, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Voir le détail
          </button>
        )}
      </div>
    </div>
  );
}

function FileBanner({ post, onOpenPost }) {
  const file = post.file || post.attachment || post;
  const fileUrl = file.url || file.fileUrl || post.fileUrl;
  const fileName = file.name || file.fileName || post.fileName || "Fichier partagé";
  const fileSize = file.size || post.fileSize;
  const canOpen = Boolean(onOpenPost);
  const handleKeyDown = (event) => {
    if (!canOpen || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpenPost(post);
  };

  return (
    <div
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={() => canOpen && onOpenPost(post)}
      onKeyDown={handleKeyDown}
      title={canOpen ? "Ouvrir la publication" : undefined}
      style={{ margin: "0 16px 12px", padding: "22px 20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, border: `1px solid ${C.line}`, borderRadius: 16, background: "linear-gradient(145deg, #F7FAFC 0%, ${C.navy50} 100%)", cursor: canOpen ? "pointer" : "default", outline: "none" }}
    >
      <div style={{ width: 82, height: 82, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(145deg, ${C.navy800}18, ${C.navy800}08)`, color: C.navy800, boxShadow: `0 10px 24px ${C.navy800}14` }}>
        <FileText size={48} strokeWidth={1.7} />
      </div>
      <div style={{ minWidth: 0, width: "100%", textAlign: "center" }}>
        <div style={{ color: C.ink, fontSize: 14.5, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
        <div style={{ marginTop: 4, color: C.muted, fontSize: 12 }}>{fileSize || file.mimeType || "Document partagé par le groupe"}</div>
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer" download={fileName} aria-label={`Télécharger ${fileName}`} onClick={(event) => event.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 2, padding: "8px 12px", borderRadius: 9, background: C.white, color: C.navy800, fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: `0 2px 8px ${C.navy800}12` }}>
          <Download size={16} />
          Télécharger
        </a>
      )}
    </div>
  );
}

/* ── Sous-composants atomiques ───────────────────────────────────────── */

function Avatar({ initials = "?", size = 44, imgUrl = null, ring = false, className = "", style = {} }) {
  return (
    <div
      className={className}
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
        ...style,
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
            color: "rgba(255,255,255,0.9)", width: "100%", height: "100%", ...style,
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
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000", ...style }}
        />
      );
    }

    return (
      <img
        key={index}
        src={item.url}
        alt={item.label || `Média ${index + 1}`}
        onClick={(e) => openLightbox(index, e)}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", cursor: "pointer", ...style }}
      />
    );
  };

  /* Layouts selon le nombre de médias */
  const wrapStyle = {
    borderRadius: 0,
    overflow: "hidden",
    margin: "0 0 4px",
    cursor: onOpenPost ? "pointer" : "default",
  };

  // Un média unique conserve ses proportions naturelles (pas de recadrage) :
  // le conteneur ne descend jamais sous la hauteur habituelle, mais s'il est
  // plus grand que le média affiché, l'espace restant est comblé par un fond
  // neutre plutôt que d'étirer/rogner le média.
  const SINGLE_MEDIA_MIN_HEIGHT = 280;
  const SINGLE_MEDIA_MAX_HEIGHT = 620;

  let galleryContent;

  if (count === 1) {
    const single = items[0];
    const singleBg = single?.url ? (single.type === "video" ? "#000" : FB.mediaBg) : undefined;
    galleryContent = (
      <div
        className="pc-media-gallery pc-media-gallery-single"
        style={{
          ...wrapStyle,
          width: "100%",
          minHeight: SINGLE_MEDIA_MIN_HEIGHT,
          maxHeight: SINGLE_MEDIA_MAX_HEIGHT,
          background: singleBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => onOpenPost?.()}
      >
        {renderItem(items[0], 0, single?.url ? {
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: SINGLE_MEDIA_MAX_HEIGHT,
          objectFit: "contain",
        } : { minHeight: SINGLE_MEDIA_MIN_HEIGHT })}
      </div>
    );
  } else if (count === 2) {
    galleryContent = (
      <div className="pc-media-gallery pc-media-gallery-multiple" style={{ ...wrapStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, minHeight: 220 }}>
        {items.map((item, i) => (
          <div key={i} className="pc-media-tile" style={{ overflow: "hidden", minHeight: 220, background: FB.mediaBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div className="pc-media-gallery pc-media-gallery-multiple" style={{ ...wrapStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, minHeight: 240 }}>
        {visible.map((item, i) => (
          <div
            key={i}
            className="pc-media-tile"
            style={{
              overflow: "hidden",
              position: "relative",
              minHeight: i === 0 ? 180 : 120,
              background: FB.mediaBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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

function ActionBar({ post, onToggleLike, onSelectReaction, onToggleBookmark, onShare, onToggleComments, onOpenPost, onOpenArticle, justShared }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerCloseTimer = useRef(null);
  const reactionWrapRef = useRef(null);
  // Ouverture au survol (souris) — inutile sur un vrai smartphone, qui n'a pas
  // de hover : on ajoute un appui long (touch) comme équivalent tactile.
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const openReactionPicker = () => {
    clearTimeout(pickerCloseTimer.current);
    setShowReactionPicker(true);
  };
  const scheduleReactionClose = () => {
    clearTimeout(pickerCloseTimer.current);
    pickerCloseTimer.current = window.setTimeout(() => setShowReactionPicker(false), 220);
  };
  const cancelReactionClose = () => clearTimeout(pickerCloseTimer.current);

  const handleReactionSelect = (reactionKey) => {
    onSelectReaction?.(post.id, reactionKey);
    setShowReactionPicker(false);
  };

  const handleReactionTouchStart = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      openReactionPicker();
      if (navigator.vibrate) navigator.vibrate(10);
    }, 380);
  };
  const handleReactionTouchEnd = (event) => {
    clearTimeout(longPressTimer.current);
    // Empêche le "J'aime" par défaut de se déclencher juste après
    // l'appui long qui vient d'ouvrir le picker.
    if (longPressFired.current) event.preventDefault();
  };

  // Fermeture au tap en dehors (le onMouseLeave ne se déclenche jamais au doigt)
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleOutside = (event) => {
      if (reactionWrapRef.current && !reactionWrapRef.current.contains(event.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [showReactionPicker]);

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
          onClick: () => onOpenPost?.(post),
        },
        shareAction,
        bookmarkAction,
      ];

  return (
    <div className="pc-actions" style={{ display: "flex", padding: "4px 8px", gap: 4 }}>
      {actions.map(({ key, icon: Icon, label, active, activeColor = C.muted, onClick, fill, reaction }) => {
        if (!reaction) {
          return (
            <button
              key={key}
              onClick={onClick}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "8px 0", borderRadius: 4, border: "none",
                background: "transparent", cursor: "pointer", fontSize: 15,
                fontWeight: 600, color: active ? activeColor : FB.textSecondary,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = FB.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={20} fill={fill && active ? activeColor : "none"} color={active ? activeColor : FB.textSecondary} />
              <span className="pc-action-label">{label}</span>
            </button>
          );
        }

        // Bouton J'aime avec ReactionPicker
        return (
          <div
            key={key}
            ref={reactionWrapRef}
            style={{ position: "relative", flex: 1 }}
            onMouseEnter={openReactionPicker}
            onMouseLeave={scheduleReactionClose}
            onTouchStart={handleReactionTouchStart}
            onTouchEnd={handleReactionTouchEnd}
            onTouchCancel={handleReactionTouchEnd}
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
                  selectedKey={post.reaction || (post.liked ? LIKE_REACTION.key : null)}
                  onSelect={handleReactionSelect}
                />
              </div>
            )}
            <button
              onClick={onClick}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0",
                borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 15,
                fontWeight: 600, color: active ? activeColor : FB.textSecondary, transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(event) => (event.currentTarget.style.background = FB.hover)}
              onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
              onMouseDown={(event) => (event.currentTarget.style.background = FB.hover)}
              onMouseUp={(event) => (event.currentTarget.style.background = "transparent")}
            >
              {post.reaction ? (
                <ReactionIcon reaction={REACTION_OPTIONS.find((item) => item.key === post.reaction) || LIKE_REACTION} selected={Boolean(post.reaction)} size={20} />
              ) : (
                <FontAwesomeIcon icon={faThumbsUp} style={{ fontSize: 20, color: active ? C.gold600 : FB.textSecondary }} />
              )}
              <span className="pc-action-label">
                {post.reaction
                  ? (REACTION_OPTIONS.find((r) => r.key === post.reaction) || LIKE_REACTION).label
                  : label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Menu contextuel "…" ─────────────────────────────────────────────── */

function ContextMenu({ isOwn, onEdit, onDelete, onOpenPost, onOpenArticle, onClose }) {
  const items = [
    onOpenArticle && { icon: BookOpen,    label: "Lire l'article",        desc: "Ouvrir l'article en entier.",              onClick: onOpenArticle },
    onOpenPost    && { icon: ExternalLink, label: "Ouvrir la publication", desc: "Afficher la publication en plein écran.",  onClick: onOpenPost },
    { icon: Link2,  label: "Copier le lien", desc: "Copiez le lien vers cette publication.", onClick: () => navigator.clipboard?.writeText(window.location.href) },
    isOwn && onEdit && { icon: Pencil, label: "Modifier", desc: "Modifier le contenu de cette publication.", onClick: onEdit },
    !isOwn && { icon: EyeOff, label: "Masquer cette publication", desc: "Voir moins de publications comme celle-ci.", onClick: onClose },
    !isOwn && { icon: Flag,   label: "Signaler la publication",   desc: "Nous alerter à propos de ce contenu.",       onClick: onClose, danger: true },
    isOwn  && { icon: Trash2, label: "Supprimer",                 desc: "Supprimer définitivement cette publication.", onClick: onDelete, danger: true },
  ].filter(Boolean);

  return (
    <div
      className="pc-context-menu"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: 40, right: 0, zIndex: 50,
        background: C.white, border: "none",
        borderRadius: 8, boxShadow: FB.menuShadow,
        minWidth: 300, maxWidth: 340, overflow: "hidden", padding: 6,
      }}
    >
      {items.map(({ icon: Icon, label, desc, onClick, danger }) => (
        <button
          key={label}
          onClick={() => { onClick?.(); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "8px", border: "none", background: "transparent",
            cursor: "pointer", textAlign: "left", borderRadius: 8,
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = FB.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: danger ? "#FBEDED" : FB.hoverStrong,
              color: danger ? C.danger : FB.text,
            }}
          >
            <Icon size={18} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span className="pc-context-menu-label" style={{ fontSize: 15, fontWeight: 600, color: danger ? C.danger : FB.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
            {desc && (
              <span className="pc-context-menu-desc" style={{ fontSize: 13, color: FB.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {desc}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Zone commentaires ───────────────────────────────────────────────── */

function ConfirmModal({ title, message, confirmLabel = "Confirmer", danger = false, onCancel, onConfirm }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 51, 82, 0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
          boxShadow: "0 18px 50px rgba(15, 51, 82, 0.22)",
          padding: 22,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: `1px solid ${C.line}`,
              background: C.white,
              color: C.ink,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: "none",
              background: danger ? C.danger : C.navy800,
              color: C.white,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUser, onToggleLike, onToggleCommentReaction, onStartReply, depth = 0, onReportComment, onHideComment, onEditComment, onDeleteComment, postId, postAuthorId }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [displayText, setDisplayText] = useState(comment.text);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReaction, setLocalReaction] = useState(comment.reaction || null);
  const [commentLikes, setCommentLikes] = useState(comment.totalReactions || comment.likes || 0);
  const emojiRef = useRef(null);
  const menuRef = useRef(null);
  const containerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const reactionCloseTimer = useRef(null);
  const commentLongPressTimer = useRef(null);
  const commentLongPressFired = useRef(false);

  useEffect(() => {
    setEditText(comment.text);
    setDisplayText(comment.text);
  }, [comment.text]);

  useEffect(() => {
    setLocalReaction(comment.reaction || null);
    setCommentLikes(comment.totalReactions || comment.likes || 0);
  }, [comment.reaction, comment.totalReactions, comment.likes]);

  const isOwnComment = currentUser?.initials === comment.initials && currentUser?.name === comment.author;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      // Fermer le reaction picker seulement si on clique en dehors du commentaire entier
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse media from comment
  const media = comment.media || (comment.mediaData ? JSON.parse(comment.mediaData) : []);

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    if (trimmed !== comment.text) {
      await onEditComment?.(comment.id, trimmed);
      setDisplayText(trimmed);
    }

    setIsEditing(false);
  };

  const handleReactionSelect = async (reactionKey) => {
    const newReaction = localReaction === reactionKey ? null : reactionKey;
    setLocalReaction(newReaction);
    setShowReactionPicker(false);

    // Appeler l'API pour sauvegarder la réaction
    try {
      const data = onToggleCommentReaction
        ? await onToggleCommentReaction(postId, comment.id, reactionKey)
        : await fetchBackendApi(`/api/posts/${postId}/comments/${comment.id}/reactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reaction: reactionKey }),
          }).then((response) => response.ok ? response.json() : null);
      if (data?.totalReactions != null) setCommentLikes(data.totalReactions);
    } catch (error) {
      console.error("Erreur lors de la gestion de la réaction:", error);
    }
  };
  const scheduleReactionClose = () => {
    clearTimeout(reactionCloseTimer.current);
    reactionCloseTimer.current = window.setTimeout(() => setShowReactionPicker(false), 180);
  };
  const keepReactionPickerOpen = () => clearTimeout(reactionCloseTimer.current);

  // Appui long = équivalent tactile du survol souris pour ouvrir le picker
  const handleCommentReactionTouchStart = () => {
    commentLongPressFired.current = false;
    commentLongPressTimer.current = window.setTimeout(() => {
      commentLongPressFired.current = true;
      setShowReactionPicker(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 380);
  };
  const handleCommentReactionTouchEnd = (event) => {
    clearTimeout(commentLongPressTimer.current);
    if (commentLongPressFired.current) event.preventDefault();
  };

  return (
    <div style={{ marginLeft: depth * 34 }}>
      <div
        style={{ display: "flex", gap: 9 }}
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setShowMenu(false);
        }}
      >
        {comment.authorId ? (
          <Link href={`/feed?view=profile&userId=${encodeURIComponent(comment.authorId)}`} aria-label={`Voir le profil de ${comment.author}`} style={{ display: "inline-flex", flexShrink: 0 }}>
            <Avatar initials={comment.initials} size={depth ? 28 : 30} imgUrl={comment.avatarUrl} />
          </Link>
        ) : <Avatar initials={comment.initials} size={depth ? 28 : 30} imgUrl={comment.avatarUrl} />}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: "8px 13px", display: "inline-block", maxWidth: "100%", position: "relative" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              {comment.authorId ? <Link href={`/feed?view=profile&userId=${encodeURIComponent(comment.authorId)}`} style={{ color: "inherit", textDecoration: "none" }}>{comment.author}</Link> : <span>{comment.author}</span>}
              {String(comment.authorId) === String(postAuthorId) && <span title="Auteur de la publication" style={{ color: C.navy800, background: C.navy50, border: `1px solid ${C.navy100}`, borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>Auteur</span>}
              {(isHovering || showMenu) && (
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <button
                    type="button"
                    className="cm-actions-trigger"
                    onClick={() => setShowMenu((value) => !value)}
                    aria-label="Options du commentaire"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      border: "none",
                      background: showMenu ? C.navy50 : "transparent",
                      color: C.muted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      opacity: isHovering || showMenu ? 1 : 0,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {showMenu && (
                    <div
                      ref={menuRef}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: "calc(100% + 8px)",
                        zIndex: 30,
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 180,
                        background: C.white,
                        border: `1px solid ${C.line}`,
                        borderRadius: 12,
                        boxShadow: "0 10px 28px rgba(15,51,82,0.14)",
                        overflow: "hidden",
                      }}
                    >
                      {[
                        { label: "Signaler", icon: Flag, onClick: () => onReportComment?.(comment.id), danger: false },
                        { label: "Masquer", icon: EyeOff, onClick: () => { setShowMenu(false); onHideComment?.(comment.id); }, danger: false },
                        isOwnComment && { label: "Modifier", icon: Pencil, onClick: () => { setIsEditing(true); setShowMenu(false); }, danger: false },
                        isOwnComment && { label: "Supprimer", icon: Trash2, onClick: () => { setShowMenu(false); onDeleteComment?.(comment.id); }, danger: true },
                      ].filter(Boolean).map(({ label, icon: Icon, onClick, danger }) => (
                        <button
                          key={label}
                          onClick={onClick}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "10px 12px",
                            border: "none",
                            background: danger ? "#FBEDED" : "transparent",
                            color: danger ? C.danger : C.ink,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = danger ? "#F6E2E2" : C.navy50;
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = danger ? "#FBEDED" : "transparent";
                          }}
                        >
                          <Icon size={14} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: C.navy800,
                      color: C.white,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.text);
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: `1px solid ${C.line}`,
                      background: C.white,
                      color: C.ink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.ink, marginTop: 1, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{displayText}</div>
            )}
            
            {/* Media in comment */}
            {media && media.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: media.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 6, marginTop: 8 }}>
                {media.map((m, idx) => (
                  <div key={idx} style={{ borderRadius: 6, overflow: "hidden", background: C.navy50 }}>
                    {m.type === "video" ? (
                      <video
                        src={m.url}
                        style={{ width: "100%", height: "auto", maxHeight: 120, objectFit: "cover", display: "block" }}
                        controls
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.label || "Média du commentaire"}
                        style={{ width: "100%", height: "auto", maxHeight: 120, objectFit: "cover", display: "block" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Réactions et actions du commentaire */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {/* Affichage des réactions */}
            {(localReaction || commentLikes > 0) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6, fontSize: 11.5, color: C.muted }}>
                <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: 2 }}>
                  {(comment.reactionKeys || (localReaction ? [localReaction] : [])).slice(0, 3).map((key) => (
                    <ReactionIcon key={key} reaction={REACTION_OPTIONS.find((r) => r.key === key) || LIKE_REACTION} selected={key === localReaction} size={14} />
                  ))}
                </span>
                {(localReaction || commentLikes > 0) && <span>{Math.max(1, commentLikes)}</span>}
              </div>
            )}

            {/* Actions du commentaire */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 6, fontSize: 11.5, color: C.muted }}>
              <RelativeTime date={comment.time} />

              {/* Bouton réaction avec picker */}
              <div
                style={{ position: "relative" }}
                ref={reactionPickerRef}
                onMouseEnter={() => setShowReactionPicker(true)}
                onMouseLeave={scheduleReactionClose}
                onTouchStart={handleCommentReactionTouchStart}
                onTouchEnd={handleCommentReactionTouchEnd}
                onTouchCancel={handleCommentReactionTouchEnd}
              >
                {showReactionPicker && (
                  <div
                    onMouseEnter={keepReactionPickerOpen}
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
                      selectedKey={localReaction}
                      onSelect={handleReactionSelect}
                    />
                  </div>
                )}
                <button
                  onClick={() => handleReactionSelect("ok")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 700,
                    color: localReaction ? C.navy800 : C.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  {localReaction ? (
                    <ReactionIcon
                      reaction={REACTION_OPTIONS.find((r) => r.key === localReaction) || LIKE_REACTION}
                      selected={true}
                      size={12}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faThumbsUp} style={{ fontSize: 12 }} />
                  )}
                  <span>J'aime</span>
                </button>
              </div>

              <button
                onClick={() => onStartReply(comment)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, color: C.muted, display: "flex", alignItems: "center", gap: 3 }}
              >
                <CornerUpLeft size={11} /> Répondre
              </button>
            </div>
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies((value) => !value)}
              style={{ marginTop: 8, marginLeft: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: C.navy700, display: "flex", alignItems: "center", gap: 3 }}
            >
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showReplies ? "Masquer les réponses" : `Afficher les ${comment.replies.length} réponse${comment.replies.length > 1 ? "s" : ""}`}
            </button>
          )}

          {/* Réponses imbriquées */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onToggleLike={onToggleLike}
                  onToggleCommentReaction={onToggleCommentReaction}
                  onStartReply={onStartReply}
                  depth={depth + 1}
                  onReportComment={onReportComment}
                  onHideComment={onHideComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  postId={postId}
                  postAuthorId={postAuthorId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentSection({ post, currentUser, onAddComment, onReplyComment, onToggleCommentLike, onToggleCommentReaction, commentsLoading = false }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [sortMode, setSortMode] = useState("relevant");
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaProgress, setMediaProgress] = useState({}); // Track upload progress per file
  const [mediaErrors, setMediaErrors] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    setLocalComments(post.comments || []);
  }, [post.comments]);

  const sortedComments = [...localComments].sort((first, second) => {
    if (sortMode === "all") return 0;
    if (sortMode === "recent") return new Date(second.time).getTime() - new Date(first.time).getTime();
    return (second.likes || 0) - (first.likes || 0);
  });

  const startReply = (comment) => setReplyingTo(comment);
  const cancelReply = () => setReplyingTo(null);

  // Upload media to Cloudinary with progress tracking
  const uploadMediaFile = async (file, fileIndex) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = file.type.startsWith("video")
      ? process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET
      : process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const resourceType = file.type.startsWith("video") ? "video" : "image";

    if (!cloudName || !preset) {
      console.error("Configuration Cloudinary incomplète");
      setMediaErrors((prev) => ({ ...prev, [fileIndex]: "Config Cloudinary manquante" }));
      return null;
    }

    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", preset);
      formData.append("resource_type", resourceType);
      formData.append("folder", "lynoralink");

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setMediaProgress((prev) => ({ ...prev, [fileIndex]: progress }));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.secure_url) {
              setMediaProgress((prev) => ({ ...prev, [fileIndex]: 100 }));
              resolve({
                url: data.secure_url,
                type: resourceType,
                label: file.name,
              });
              return;
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
        setMediaErrors((prev) => ({ ...prev, [fileIndex]: "Erreur upload" }));
        resolve(null);
      });

      xhr.addEventListener("error", () => {
        setMediaErrors((prev) => ({ ...prev, [fileIndex]: "Erreur réseau" }));
        resolve(null);
      });

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
      xhr.send(formData);
    });
  };

  const handleMediaSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingMedia(true);
    setMediaProgress({});
    setMediaErrors({});

    try {
      const uploadedMedia = [];
      for (let i = 0; i < files.length; i++) {
        const uploaded = await uploadMediaFile(files[i], i);
        if (uploaded) {
          uploadedMedia.push(uploaded);
        }
      }
      setAttachedMedia((prev) => [...prev, ...uploadedMedia]);
    } finally {
      setUploadingMedia(false);
      setTimeout(() => {
        setMediaProgress({});
        setMediaErrors({});
      }, 1500);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const editComment = async (commentId, newText) => {
    try {
      const res = await fetchBackendApi(`/api/posts/${post.id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) throw new Error("Erreur lors de la modification");

      const updated = await res.json();
      const normalized = {
        ...updated,
        time: updated.createdAt || new Date().toISOString(),
        likes: updated.likes || 0,
        liked: false,
        media: updated.media || [],
        replies: updated.replies || [],
      };

      setLocalComments((prev) => prev.map((commentItem) => commentItem.id === commentId ? { ...commentItem, ...normalized, text: newText } : commentItem));
      console.log("Commentaire modifié avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la modification du commentaire");
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const res = await fetchBackendApi(`/api/posts/${post.id}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");

      setLocalComments((prev) => prev.filter((commentItem) => commentItem.id !== commentId));
      console.log("Commentaire supprimé avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la suppression du commentaire");
    }
  };

  const requestDeleteComment = (commentId) => {
    setConfirmAction({ type: "delete", commentId });
  };

  const requestHideComment = (commentId) => {
    setConfirmAction({ type: "hide", commentId });
  };

  const confirmActionHandler = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "delete") {
      await deleteComment(confirmAction.commentId);
    }

    if (confirmAction.type === "hide") {
      setLocalComments((prev) => prev.filter((commentItem) => commentItem.id !== confirmAction.commentId));
    }

    setConfirmAction(null);
  };

  const reportComment = async (commentId) => {
    const reason = window.prompt("Pourquoi signalez-vous ce commentaire ?", "Contenu inapproprié");
    if (!reason) return;

    try {
      const res = await fetchBackendApi("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "comment",
          targetId: commentId,
          targetLabel: `Commentaire ${commentId}`,
          reason,
          details: "Signalement depuis la modale de commentaire",
        }),
      });
      if (!res.ok) throw new Error("Erreur lors du signalement");
      alert("Commentaire signalé avec succès.");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Le signalement n’a pas pu être enregistré.");
    }
  };

  const hideComment = async (commentId) => {
    setLocalComments((prev) => prev.filter((commentItem) => commentItem.id !== commentId));
    console.log("Commentaire masqué:", commentId);
  };

  const submit = async () => {
    if ((!draft.trim() && attachedMedia.length === 0) || submitting) return;
    setSubmitting(true);
    try {
      if (replyingTo) {
        await onReplyComment?.(
          post.id,
          replyingTo.id,
          draft.trim(),
          attachedMedia.length > 0 ? attachedMedia : undefined
        );
      } else {
        await onAddComment(
          post.id,
          draft.trim(),
          attachedMedia.length > 0 ? attachedMedia : undefined
        );
      }
      setDraft("");
      setAttachedMedia([]);
      setReplyingTo(null);
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setLocalComments(post.comments || []);
  }, [post.comments]);

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
      {/* Bandeau réponse embriqué */}
      {replyingTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: C.navy50, borderLeft: `3px solid ${C.gold600}` }}>
          <CornerUpLeft size={13} color={C.navy700} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navy800 }}>
              Réponse à {replyingTo.author}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {replyingTo.text}
            </div>
          </div>
          <button onClick={cancelReply} style={{ border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer", display: "flex", flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Liste des commentaires */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Commentaires</span>
        {post.comments.length > 1 && !commentsLoading && (
          <select
            aria-label="Filtrer les commentaires"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 8px", background: C.white, cursor: "pointer" }}
          >
            <option value="all">Tous les commentaires</option>
            <option value="relevant">Les plus pertinents</option>
            <option value="recent">Les plus récents</option>
          </select>
        )}
      </div>
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === "delete" ? "Supprimer ce commentaire ?" : "Masquer ce commentaire ?"}
          message={
            confirmAction.type === "delete"
              ? "Cette action est irréversible. Le commentaire sera supprimé définitivement."
              : "Le commentaire ne sera plus affiché pour vous."
          }
          confirmLabel={confirmAction.type === "delete" ? "Supprimer" : "Masquer"}
          danger={confirmAction.type === "delete"}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmActionHandler}
        />
      )}

      <div style={{ maxHeight: "240px", overflowY: "auto", paddingRight: 4 }}>
        {commentsLoading ? (
          <CommentSkeleton count={3} />
        ) : localComments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUser={currentUser}
                onToggleLike={onToggleCommentLike}
                  onToggleCommentReaction={onToggleCommentReaction}
                onStartReply={startReply}
                depth={0}
                onReportComment={reportComment}
                onHideComment={requestHideComment}
                onEditComment={editComment}
                onDeleteComment={requestDeleteComment}
                postId={post.id}
                postAuthorId={post.authorId}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: C.mutedLight, fontSize: 13 }}>
            Aucun commentaire pour le moment. Soyez le premier !
          </div>
        )}
      </div>

      {/* Média prévisionnalisés avec progression */}
      {(attachedMedia.length > 0 || uploadingMedia) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, padding: "8px 0" }}>
          {attachedMedia.map((media, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                background: C.navy50,
                aspectRatio: "1",
              }}
            >
              {media.type === "video" ? (
                <video
                  src={media.url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <img
                  src={media.url}
                  alt={media.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              <button
                onClick={() => removeMedia(idx)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: C.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Aperçus en chargement avec barre de progression */}
          {uploadingMedia &&
            Object.entries(mediaProgress).map(([idx, progress]) => {
              if (attachedMedia[parseInt(idx)]) return null; // Skip if already uploaded

              return (
                <div
                  key={`loading-${idx}`}
                  style={{
                    position: "relative",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: C.navy50,
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${C.line}`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(90deg, rgba(217,165,54,0.2) 0%, rgba(217,165,54,0.1) ${progress}%, rgba(255,255,255,0.05) ${progress}%, rgba(255,255,255,0.05) 100%)`,
                      animation: "shimmer 2s infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `2px solid ${C.gold600}`,
                        borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: C.navy800,
                      }}
                    >
                      {progress}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
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
            placeholder={replyingTo ? `Répondre à ${replyingTo.author}…` : "Ajouter un commentaire…"}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: C.ink }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia || submitting}
              aria-label="Ajouter une photo"
              title="Ajouter une photo"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: uploadingMedia || submitting ? "default" : "pointer",
                color: uploadingMedia || submitting ? C.line : C.muted,
                opacity: uploadingMedia || submitting ? 0.5 : 1,
              }}
            >
              <ImageIcon size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              onChange={handleMediaSelect}
              style={{ display: "none" }}
            />
            <button
              onClick={() => setShowEmoji((value) => !value)}
              aria-label="Ajouter un emoji"
              style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted }}
            >
              <FontAwesomeIcon icon={faFaceSmile} style={{ fontSize: 15, width: 15, height: 15 }} />
            </button>
            {showEmoji && (
              <div className="emoji-picker-popover" style={{ position: "absolute", bottom: 38, right: 0, zIndex: 20 }}>
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
            disabled={(!draft.trim() && attachedMedia.length === 0) || submitting || uploadingMedia}
            title="Envoyer"
            style={{
              width: 30, height: 30, borderRadius: "50%", border: "none",
              background: ((draft.trim() || attachedMedia.length > 0) && !submitting && !uploadingMedia) ? C.navy800 : C.line, color: C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: ((draft.trim() || attachedMedia.length > 0) && !submitting && !uploadingMedia) ? "pointer" : "default",
              transition: "background 0.15s ease", flexShrink: 0,
            }}
          >
            {submitting || uploadingMedia ? (
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
  const presentation = post.presentation || {};
  const theme = {
    "navy-gold": { accent: C.navy800, soft: "#F7F3EA", text: C.ink },
    forest: { accent: "#24594A", soft: "#F1F5EF", text: "#20352E" },
    coral: { accent: "#B75245", soft: "#FFF3EF", text: "#302426" },
    ocean: { accent: "#176A83", soft: "#EEF7F8", text: "#20333A" },
  }[presentation.theme] || { accent: C.navy800, soft: C.white, text: C.ink };
  const font = presentation.font === "modern" ? "'Sora', sans-serif" : presentation.font === "compact" ? "'Trebuchet MS', sans-serif" : "Georgia, serif";
  const lineHeight = presentation.density === "dense" ? 1.55 : presentation.density === "balanced" ? 1.7 : 1.85;


function SharedPostBanner({ post }) {
  if (!post?.link) return null;
  const sharedArticleLink = post.isArticle && post.sharedPostId
    ? `/feed?post=${encodeURIComponent(post.sharedPostId)}&article=1`
    : post.link;
  return (
    <a href={sharedArticleLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px", padding: 12, border: `1px solid ${FB.divider}`, borderRadius: 12, background: FB.hover, color: FB.text, textDecoration: "none" }}>
      {post.media?.[0]?.url ? <img src={post.media[0].url} alt="" style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : <span style={{ width: 36, height: 36, borderRadius: 10, background: C.navy50, color: C.navy800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BookOpen size={17} /></span>}
      <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.headline || "Publication partagée"}</strong><span style={{ display: "block", marginTop: 3, fontSize: 11.5, color: FB.textSecondary }}>Ouvrir le contenu partagé</span></span>
      <ExternalLink size={15} color={FB.textSecondary} />
    </a>
  );
}
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
        className="pc-article-cover"
        style={{
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: canOpen ? "pointer" : "default",
          transition: "box-shadow 0.18s ease, border-color 0.18s ease",
          boxShadow: coverHovered && canOpen
            ? "0 4px 20px rgba(15,51,82,0.13)"
            : "0 1px 4px rgba(15,51,82,0.06)",
          borderColor: coverHovered && canOpen ? theme.accent : C.line,
        }}
        onMouseEnter={() => setCoverHovered(true)}
        onMouseLeave={() => setCoverHovered(false)}
        onClick={() => canOpen && onOpenArticle(post)}
      >
        {/* Cover */}
        <div className="pc-article-cover" style={{ position: "relative", width: "100%", height: coverSrc ? 200 : 160, borderRadius: 12, overflow: "hidden" }}>
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={post.headline || "Couverture de l'article"}
              style={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                transition: "transform 0.3s ease",
                transform: coverHovered && canOpen ? "scale(1.02)" : "scale(1)",
                borderRadius: 12,
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
        <div style={{ padding: "14px 14px 12px", background: theme.soft }}>

          {/* Titre */}
          {post.headline && (
            <h3 style={{
              fontFamily: font, fontWeight: 800,
              fontSize: 17, lineHeight: 1.35, color: theme.accent,
              margin: "0 0 7px", letterSpacing: "-0.01em",
              transition: "color 0.15s ease",
              color: coverHovered && canOpen ? theme.accent : theme.accent,
            }}>
              {post.headline}
            </h3>
          )}

          {/* Extrait */}
          {post.excerpt && (
            <p style={{
              fontSize: 13, color: theme.text, lineHeight,
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
              {post.authorId ? <Link href={`/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} aria-label={`Voir le profil de ${post.author}`} style={{ display: "inline-flex" }}><div style={{
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
              </div></Link> : <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: post.avatarUrl ? C.navy100 : navyGrad,
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: C.white,
                fontFamily: "'Sora', sans-serif",
              }}>{post.avatarUrl ? <img src={post.avatarUrl} alt={post.author} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (post.initials || "?")}</div>}
              {post.authorId ? <Link href={`/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} style={{ fontSize: 12, fontWeight: 600, color: C.muted, textDecoration: "none" }}>{post.author}</Link> : <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{post.author}</span>}
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
  const commentCount = countComments(post.comments);
  const reactionCount = getReactionCount(post);
  const hasReactions = reactionCount > 0 || commentCount > 0 || post.shares > 0;
  if (!hasReactions) return null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", fontSize: 15, color: FB.textSecondary }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {reactionCount > 0 && (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: 2 }} aria-label="Réactions">
              {getEngagementReactions(post).map((reaction, index) => (
                <span
                  key={reaction.key}
                  style={{ marginLeft: index === 0 ? 0 : -6, zIndex: 3 - index, borderRadius: "50%", boxShadow: `0 0 0 1.5px ${C.white}` }}
                >
                  <ReactionIcon reaction={reaction} selected={reaction.key === post.reaction} size={14} />
                </span>
              ))}
            </span>
            <span style={{ fontSize: 15, color: FB.textSecondary }}>{fmtCount(reactionCount)}</span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {commentCount > 0 && (
          <button
            onClick={() => onOpenPost ? onOpenPost(post) : onToggleComments()}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: FB.textSecondary, padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {commentCount} commentaire{commentCount > 1 ? "s" : ""}
          </button>
        )}
        {(post.shares || 0) > 0 && <span style={{ fontSize: 15 }}>{fmtCount(post.shares)} partage{post.shares > 1 ? "s" : ""}</span>}
      </div>
    </div>
  );
}

function PostContextMeta({ post, currentUserId }) {
  const mood = post?.mood;
  const identifiedUsers = Array.isArray(post?.identifiedUsers) ? post.identifiedUsers.filter((user) => user?.name) : [];
  if (!mood && identifiedUsers.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 5, color: FB.textSecondary, fontSize: 12 }}>
      {mood?.emoji && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "#FFF7E0", color: "#8A6418", fontWeight: 700 }}>{mood.emoji} {mood.label || "Humeur"}</span>}
      {identifiedUsers.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {identifiedUsers.slice(0, 5).map((user, index) => user.id === currentUserId ? (
            <span key={user.id || `${user.name}-${index}`} style={{ fontWeight: 700, color: C.navy800 }}>vous</span>
          ) : user.id ? (
            <Link key={user.id || `${user.name}-${index}`} href={`/feed?view=profile&userId=${encodeURIComponent(user.id)}`} aria-label={`Voir le profil de ${user.name}`} style={{ fontWeight: 700, color: C.navy800, textDecoration: "none" }}>@{user.name}</Link>
          ) : (
            <span key={`${user.name}-${index}`} style={{ fontWeight: 700, color: C.navy800 }}>@{user.name}</span>
          ))}
          {identifiedUsers.length > 5 && <span>+{identifiedUsers.length - 5}</span>}
        </span>
      )}
    </div>
  );
}

/* ── Texte du post avec expand ───────────────────────────────────────── */

const TEXT_COLLAPSE_THRESHOLD = 240; // nb de caractères max avant troncature
const TEXT_COLLAPSE_MAX_LINES = 6;   // nb de retours à la ligne max avant troncature

/**
 * Tronque un texte long à la limite de caractères la plus proche d'un mot
 * (évite de couper un mot en plein milieu), et/ou au nombre de lignes max.
 */
function truncateText(text, { charLimit, lineLimit }) {
  const lines = text.split("\n");
  let truncated = text;
  let cutByLines = false;

  if (lines.length > lineLimit) {
    truncated = lines.slice(0, lineLimit).join("\n");
    cutByLines = true;
  }

  if (truncated.length > charLimit) {
    const slice = truncated.slice(0, charLimit);
    const lastSpace = slice.lastIndexOf(" ");
    truncated = lastSpace > charLimit * 0.6 ? slice.slice(0, lastSpace) : slice;
    cutByLines = false;
  }

  return { truncated: truncated.trimEnd(), wasCut: cutByLines || truncated.length < text.length };
}

function PostText({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const lineCount = text.split("\n").length;
  const isLong = text.length > TEXT_COLLAPSE_THRESHOLD || lineCount > TEXT_COLLAPSE_MAX_LINES;

  const { truncated } = isLong
    ? truncateText(text, { charLimit: TEXT_COLLAPSE_THRESHOLD, lineLimit: TEXT_COLLAPSE_MAX_LINES })
    : { truncated: text };

  const displayed = isLong && !expanded ? `${truncated}…` : text;

  return (
    <div className="pc-body-text" style={{ padding: "0 16px 10px", fontSize: 15, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {displayed}
      {isLong && (
        <button
          onClick={() => setExpanded((s) => !s)}
          style={{ display: expanded ? "block" : "inline", marginTop: expanded ? 4 : 0, background: "none", border: "none", padding: "0 0 0 6px", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 14 }}
        >
          {expanded ? "Voir moins" : "Voir plus"}
          <ChevronDown size={13} style={{ marginLeft: 3, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </button>
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  SHARE MODAL                                                       */
/* ------------------------------------------------------------------ */
function ShareModal({ post, group = null, onClose, onRepost }) {
  const [tab, setTab] = useState("message");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const postUrl = typeof window === "undefined" ? "" : `${window.location.origin}/feed?post=${post.id}`;
  const shareText = post?.text || post?.headline || "Découvrez cette publication sur LynoraLink.";
  const sharedAttachments = [
    ...(post?.isArticle || post?.headline ? [{ type: "article", url: postUrl, name: post.headline || "Article LynoraLink", title: post.headline || "Article LynoraLink", text: post.excerpt || shareText, thumbnail: post.coverUrl || null }] : []),
    ...(Array.isArray(post?.media) ? post.media : post?.media ? [post.media] : [])
      .filter((media) => media?.url)
      .map((media) => ({ ...media, type: media.type || (media.mime?.startsWith("video/") ? "video" : "image") })),
    ...[...shareText.matchAll(/https?:\/\/[^\s)]+/g)].map(([url]) => ({ type: "link", url, name: url })),
    { type: "link", url: postUrl, name: "Voir la publication sur LynoraLink" },
  ];

  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    Promise.all([
      fetchBackendApi("/api/users").then((response) => response.ok ? response.json() : null),
      fetchBackendApi("/api/groups").then((response) => response.ok ? response.json() : null),
    ]).then(([userData, groupData]) => {
      setUsers(Array.isArray(userData?.users) ? userData.users : []);
      setGroups(Array.isArray(groupData?.groups) ? groupData.groups : []);
    }).catch(() => setStatus("Impossible de charger les destinataires."));
  }, []);

  const filteredUsers = users.filter((user) => (user.name || "").toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const shareableGroups = groups.filter((group) => group.canShare !== false);

  const sendMessage = async () => {
    if (!selectedUsers.length) return;
    setStatus("Envoi en cours...");
    const text = message.trim() || shareText;
    try {
      const responses = await Promise.all(selectedUsers.map((user) => fetchBackendApi("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: user.id, text, attachments: sharedAttachments }),
      })));
      if (responses.some((response) => !response.ok)) throw new Error("message");
      setStatus(`${selectedUsers.length} message${selectedUsers.length > 1 ? "s" : ""} envoyé${selectedUsers.length > 1 ? "s" : ""}.`);
      setTimeout(onClose, 500);
    } catch {
      setStatus("Le message n'a pas pu être envoyé.");
    }
  };

  const shareInGroup = async () => {
    if (!selectedGroup) return;
    setStatus("Partage en cours...");
    try {
      const response = await fetchBackendApi(`/api/groups/${selectedGroup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          url: postUrl,
          title: post?.headline || "Publication partagée",
          excerpt: post?.excerpt || "",
          isArticle: Boolean(post?.isArticle || post?.headline),
          media: Array.isArray(post?.media) ? post.media : post?.coverUrl ? [{ type: "image", url: post.coverUrl, name: post.headline || "Image de couverture" }] : [],
          text: shareText,
        }),
      });
      if (!response.ok) throw new Error("group");
      setStatus(`Publication partagée dans ${selectedGroup.name}.`);
      setTimeout(onClose, 700);
    } catch {
      setStatus("Le partage dans ce groupe est impossible.");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(postUrl);
    setStatus("Lien copié.");
  };

  return (
    <div className="pc-share-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={onClose}>
      <div className="pc-share-modal" onClick={(event) => event.stopPropagation()} style={{ width: "95%", maxWidth: 460, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", background: C.white, borderRadius: 22, boxShadow: "0 30px 60px rgba(0,0,0,.22)" }}>
        <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1B5E40 0%, #122318 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Share2 size={18} style={{ color: C.gold400 }} />
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, color: C.white, margin: 0 }}>Partager la publication</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} style={{ color: C.white }} /></button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexShrink: 0, overflowX: "auto" }}>
          {[{ key: "message", label: "Message", icon: Send }, { key: "group", label: "Groupe", icon: Users }, { key: "social", label: "Réseaux", icon: ExternalLink }].map(({ key, label, icon: Icon }) => (
            <button type="button" key={key} onClick={() => { setTab(key); setStatus(""); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 4px 11px", border: "none", borderBottom: `2px solid ${tab === key ? C.navy800 : "transparent"}`, background: "transparent", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, color: tab === key ? C.navy800 : C.mutedLight, cursor: "pointer", marginRight: 18, whiteSpace: "nowrap" }}><Icon size={13} />{label}</button>
          ))}
        </div>
        <div style={{ margin: "12px 24px 0", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", background: C.navy50 }}>
          {group ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
              <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.white}`, background: group.coverGradient || navyGrad, boxShadow: "0 2px 8px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {group.avatarUrl ? <img src={group.avatarUrl} alt={group.name || "Groupe"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (group.emoji || "🌐")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>Publication à partager dans ce groupe</div>
              </div>
              <Avatar initials={post.initials} imgUrl={post.avatarUrl} size={38} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
              <Avatar initials={post.initials} imgUrl={post.avatarUrl} size={38} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.author || "Utilisateur"}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>Publication à partager</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "16px 24px 24px", overflowY: "auto", fontFamily: "'Sora', sans-serif" }}>
          {tab === "message" && <>
            <label style={{ display: "block", marginBottom: 8, color: C.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Membres de la plateforme</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: LI_HOVER }}><Search size={13} color={C.mutedLight} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13 }} /></div>
            <div style={{ maxHeight: 210, minHeight: 120, overflowY: "auto", padding: "4px 0" }}>{filteredUsers.map((user) => { const selected = selectedUsers.some((selectedUser) => selectedUser.id === user.id); return <button type="button" key={user.id} onClick={() => setSelectedUsers((current) => selected ? current.filter((selectedUser) => selectedUser.id !== user.id) : [...current, user])} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", borderRadius: 12, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2 }}><Avatar initials={(user.name || "U").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()} imgUrl={user.image || user.avatarUrl || user.photoUrl || null} size={34} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>{user.name}</span><span style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{selected ? <Check size={12} color={C.white} /> : null}</span></button>; })}</div>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ajouter un message (facultatif)" rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, resize: "vertical", background: LI_HOVER, fontFamily: "inherit", fontSize: 13 }} />
            <div style={{ padding: "14px 0 0", marginTop: 4, borderTop: `1px solid ${C.line}` }}><button type="button" disabled={!selectedUsers.length} onClick={sendMessage} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, borderRadius: 8, border: "none", background: selectedUsers.length ? C.navy800 : C.line, color: selectedUsers.length ? C.white : C.mutedLight, fontWeight: 700, cursor: selectedUsers.length ? "pointer" : "not-allowed", opacity: selectedUsers.length ? 1 : .55 }}><Send size={14} />Envoyer à {selectedUsers.length || "..."} destinataire{selectedUsers.length > 1 ? "s" : ""}</button></div>
          </>}
          {tab === "group" && <>
            <p style={{ margin: "0 0 12px", color: LI_SECONDARY, fontSize: 13 }}>Choisissez un groupe dont vous êtes membre.</p>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>{shareableGroups.map((group) => <button type="button" key={group.id} onClick={() => setSelectedGroup(group)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 10, border: "none", borderRadius: 8, background: selectedGroup?.id === group.id ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}><span aria-label={`Couverture de ${group.name}`} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: group.coverGradient || navyGrad, backgroundImage: group.coverUrl ? `url(${group.coverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>{group.coverUrl ? null : (group.emoji || "🌐")}</span><span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{group.name}</span>{selectedGroup?.id === group.id && <Check size={16} color={LINKEDIN_BLUE} />}</button>)}</div>
            <button type="button" disabled={!selectedGroup} onClick={shareInGroup} style={{ width: "100%", marginTop: 12, padding: 11, border: "none", borderRadius: 8, background: selectedGroup ? LINKEDIN_BLUE : LI_BORDER, color: selectedGroup ? C.white : LI_SECONDARY, fontWeight: 700, cursor: selectedGroup ? "pointer" : "default" }}>Partager dans le groupe</button>
          </>}
          {tab === "social" && <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: LI_HOVER, borderRadius: 8, marginBottom: 14 }}><Link2 size={16} color={LI_SECONDARY} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: LI_SECONDARY }}>{postUrl}</span><button type="button" onClick={copyLink} aria-label="Copier le lien"><Copy size={15} /></button></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>{[
              ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`, faWhatsapp, "#25D366"],
              ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`, faLinkedin, "#0A66C2"],
              ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, faFacebook, "#1877F2"],
              ["X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`, faXTwitter, "#111111"],
              ["E-mail", `mailto:?subject=${encodeURIComponent("Publication LynoraLink")}&body=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`, null, C.navy800],
            ].map(([label, href, icon, color]) => <a key={label} href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" aria-label={label} title={label} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11, border: `1px solid ${LI_BORDER}`, borderRadius: 10, color: LI_TEXT, textDecoration: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{icon ? <FontAwesomeIcon icon={icon} style={{ color, fontSize: 16 }} /> : <Mail size={16} color={color} />}{label === "X" ? null : label}</a>)}</div>
          </>}
          {status && <div role="status" style={{ marginTop: 14, textAlign: "center", color: status.includes("impossible") || status.includes("pas pu") ? "#b42318" : LINKEDIN_BLUE, fontSize: 12.5, fontWeight: 600 }}>{status}</div>}
          {tab === "message" && <button type="button" onClick={() => { onRepost?.(); onClose(); }} style={{ width: "100%", marginTop: 16, padding: 10, border: `1px solid ${LI_BORDER}`, borderRadius: 8, background: C.white, color: LI_TEXT, fontWeight: 700, cursor: "pointer" }}><Share2 size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />Republier sur mon profil</button>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  POSTCARD — composant principal                                       */
/* ══════════════════════════════════════════════════════════════════════ */

function JobOfferCard({ post, currentUser, currentUserId, isOwn = false, onDelete, onJobAction, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onReplyComment, onToggleCommentLike, onShare, onOpenPost, onFollowPage, followedPageIds = [], justShared = false }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const engagementRequestRef = useRef(0);
  const engagementStorageKey = `lynoralink:job-engagement:${currentUserId || "guest"}:${post.id}`;
  const normalizeJobReactions = (reactions = {}) => {
    const next = Object.fromEntries(Object.entries(reactions || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : (value && typeof value === "object" ? [...(value.userIds || [])] : [])]));
    return next;
  };
  const applyJobUserReaction = (state, nextReaction) => {
    const normalized = normalizeJobReactions(state.reactions || {});
    const previousReaction = Object.entries(normalized).find(([, ids]) => Array.isArray(ids) && ids.includes(currentUserId))?.[0] || null;
    const normalizedPrevious = previousReaction ? normalizeReactionKey(previousReaction) : null;
    const normalizedNext = nextReaction ? normalizeReactionKey(nextReaction) : null;

    if (normalizedPrevious && normalizedPrevious !== normalizedNext) {
      normalized[normalizedPrevious] = (normalized[normalizedPrevious] || []).filter((id) => id !== currentUserId);
    }

    if (normalizedPrevious === normalizedNext) {
      normalized[normalizedPrevious] = (normalized[normalizedPrevious] || []).filter((id) => id !== currentUserId);
    }

    if (normalizedNext) {
      normalized[normalizedNext] = [...new Set([...(normalized[normalizedNext] || []), currentUserId])];
    }

    const summary = buildReactionSummary(normalized, currentUserId, normalizedNext || null);

    return {
      ...state,
      liked: summary.liked,
      reaction: summary.reaction,
      reactions: summary.reactions,
      reactionKeys: summary.reactionKeys,
      likes: summary.likes,
    };
  };
  const [jobState, setJobState] = useState(() => {
    const fallback = { liked: Boolean(post.liked), bookmarked: Boolean(post.bookmarked), likes: Number(post.likes || 0), reaction: post.reaction || null, reactionKeys: post.reactionKeys || (post.reaction ? [post.reaction] : []), reactions: normalizeJobReactions(post.reactions || {}), comments: post.comments || [], shares: Number(post.shares || 0) };
    if (typeof window === "undefined") return fallback;
    try {
      const saved = JSON.parse(window.localStorage.getItem(engagementStorageKey) || "null");
      return saved && typeof saved === "object" ? { ...fallback, ...saved, reactions: normalizeJobReactions(saved.reactions || fallback.reactions) } : fallback;
    } catch {
      return fallback;
    }
  });
  const ctaLabel = post.jobCtaLabel || (post.jobType === "Appel d'offres" ? "Répondre à l'appel" : "Postuler");
  const hasMeta = Boolean(post.contract || post.loc);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const description = post.description || post.text || "";
  const descriptionLineCount = description.split("\n").length;
  const descriptionIsLong = description.length > TEXT_COLLAPSE_THRESHOLD || descriptionLineCount > TEXT_COLLAPSE_MAX_LINES;
  const descriptionPreview = descriptionIsLong && !descriptionExpanded
    ? `${truncateText(description, { charLimit: TEXT_COLLAPSE_THRESHOLD, lineLimit: TEXT_COLLAPSE_MAX_LINES }).truncated}…`
    : description;
  const actionPost = { ...post, ...jobState };
  const coverSrc = post.coverUrl || post.imageUrl || post.image || normalizeMedia(post.media).find((item) => item?.type === "image")?.url || null;
  const jobId = post.jobId || post.id;
  const loadEngagement = async () => {
    const requestId = ++engagementRequestRef.current;
    const response = await fetchBackendApi(`/api/company/jobs/engagement?ownerId=${encodeURIComponent(post.companyPageId)}&jobId=${encodeURIComponent(jobId)}`);
    if (!response.ok) return;
    const data = await response.json();
    if (requestId !== engagementRequestRef.current) return;
    const reactions = normalizeJobReactions(data.reactions || {});
    const summary = buildReactionSummary(reactions, currentUserId, data.reaction || null);
    setJobState((state) => ({
      ...state,
      ...data,
      reactions: summary.reactions,
      comments: decorateJobOfferComments(data.comments || [], currentUserId),
      liked: summary.liked,
      reaction: summary.reaction,
      reactionKeys: summary.reactionKeys,
      likes: summary.likes,
      bookmarked: Array.isArray(data.bookmarks) ? data.bookmarks.includes(currentUserId) : Boolean(state.bookmarked),
    }));
  };
  useEffect(() => {
    loadEngagement().catch(() => {});
    const interval = window.setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive
      loadEngagement().catch(() => {});
    }, 10000); // Increased from 1s to 10s
    return () => window.clearInterval(interval);
  }, [post.companyPageId, jobId, currentUserId]);
  useEffect(() => {
    try {
      window.localStorage.setItem(engagementStorageKey, JSON.stringify({
        liked: jobState.liked,
        bookmarked: jobState.bookmarked,
        likes: jobState.likes,
        reaction: jobState.reaction,
        reactionKeys: jobState.reactionKeys,
        reactions: jobState.reactions,
        comments: jobState.comments,
        shares: jobState.shares,
      }));
    } catch {}
  }, [engagementStorageKey, jobState]);
  const toggleJobLike = () => {
    const nextReaction = jobState.reaction === "ok" ? null : "ok";
    setJobState((state) => applyJobUserReaction(state, nextReaction));
    fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "reaction", reaction: "ok" }) }).then(() => loadEngagement()).catch(() => {});
  };
  const toggleJobBookmark = () => {
    setJobState((state) => ({ ...state, bookmarked: !state.bookmarked }));
    fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "bookmark" }) }).then(() => loadEngagement()).catch(() => {});
  };
  const selectJobReaction = (_postId, reaction) => {
    setJobState((state) => applyJobUserReaction(state, state.reaction === reaction ? null : reaction));
    fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "reaction", reaction }) }).then(() => loadEngagement()).catch(() => {});
  };
  const addJobComment = async (postId, text) => {
    const result = await onAddComment?.(postId, text);
    if (result) setJobState((state) => ({ ...state, comments: result.comments || state.comments, shares: result.shares || state.shares }));
    return result;
  };
  const toggleJobCommentReaction = async (postId, commentId, reaction) => {
    ++engagementRequestRef.current;
    const response = await fetchBackendApi("/api/company/jobs/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "commentReaction", commentId, reaction }),
    });
    if (!response.ok) throw new Error("Impossible de réagir au commentaire");
    const result = await response.json();
    setJobState((state) => ({ ...state, comments: decorateJobOfferComments(result.comments || state.comments, currentUserId) }));
    return result;
  };
  const replyJobComment = async (postId, parentCommentId, text, media = []) => {
    ++engagementRequestRef.current;
    const response = await fetchBackendApi("/api/company/jobs/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "commentReply", parentCommentId, text, media }),
    });
    if (!response.ok) throw new Error("Impossible de répondre au commentaire");
    const result = await response.json();
    setJobState((state) => ({ ...state, comments: decorateJobOfferComments(result.comments || state.comments, currentUserId) }));
    return result;
  };
  const shareJob = () => {
    setShareOpen(true);
  };
  const repostJob = () => {
    setJobState((state) => ({ ...state, shares: state.shares + 1 }));
    fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "share" }) }).then(() => loadEngagement()).catch(() => {});
    onShare?.(post.id);
  };
  const jobActionHandlers = {
    onToggleLike: toggleJobLike,
    onSelectReaction: selectJobReaction,
    onToggleBookmark: toggleJobBookmark,
    onShare: shareJob,
    onToggleComments: () => onOpenPost?.(actionPost),
    onOpenPost: () => onOpenPost?.(actionPost),
    onOpenArticle: undefined,
    justShared,
  };
  return (
    <article className="pc-card pc-job-card" style={{ overflow: "hidden", background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: "0 8px 24px rgba(15,51,82,0.08)" }}>
      <style>{`
        .pc-job-card .pc-job-header,
        .pc-job-card .pc-job-content { padding-left: 22px; padding-right: 22px; }
        @media (max-width: 900px) {
          .pc-job-card .pc-job-header { padding: 10px 12px 8px !important; }
          .pc-job-card .pc-job-content { padding: 14px 12px 16px !important; }
          .pc-job-card .pc-job-title { font-size: 18px !important; }
          .pc-job-card .pc-job-type { font-size: 10px !important; }
          .pc-job-card .pc-job-cta { min-height: 42px !important; margin-top: 14px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pc-job-card * { transition: none !important; }
        }
      `}</style>
      <div className="pc-header pc-job-header" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px 10px" }}>
        <ProfileHoverPreview type="page" fallback={{ id: post.companyPageId || post.authorId, name: post.author || "Page entreprise", avatarUrl: post.avatarUrl, coverUrl: post.pageCoverUrl || post.coverUrl, bio: post.description, location: post.location, followersCount: post.followersCount }}>
          <Link href={`/feed?view=company&pageId=${encodeURIComponent(post.companyPageId || post.authorId || "")}`} aria-label={`Voir la page ${post.author || "Page entreprise"}`} style={{ display: "inline-flex" }}>
            <Avatar className="pc-header-avatar" initials={post.initials} size={40} imgUrl={post.avatarUrl} />
          </Link>
        </ProfileHoverPreview>
        <div className="pc-header-main" style={{ flex: 1, minWidth: 0 }}>
          <div className="pc-header-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
              <ProfileHoverPreview type="page" fallback={{ id: post.companyPageId || post.authorId, name: post.author || "Page entreprise", avatarUrl: post.avatarUrl, coverUrl: post.pageCoverUrl || post.coverUrl, bio: post.description, location: post.location, followersCount: post.followersCount }}>
                <Link href={`/feed?view=company&pageId=${encodeURIComponent(post.companyPageId || post.authorId || "")}`} className="pc-header-name" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: FB.text, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
                  {post.author || "Page entreprise"}
                </Link>
              </ProfileHoverPreview>
              <EnterpriseBadge size={14} label="Page entreprise" />
              {!post.isPlatformAdmin && post.isPremium && <PremiumBadge size={14} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {post.companyPageId && onFollowPage && <button type="button" onClick={() => onFollowPage(post.companyPageId)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 8, border: "1px solid #D9A536", background: followedPageIds.some((id) => String(id) === String(post.companyPageId)) ? "#FFF8E5" : "linear-gradient(135deg, #F6D374, #D9A536)", color: "#0F3352", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{followedPageIds.some((id) => String(id) === String(post.companyPageId)) ? <><Check size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}</button>}
            <div style={{ position: "relative" }}>
              <button type="button" aria-label="Options de l'offre" onClick={() => setMenuOpen((open) => !open)} style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "50%", background: "transparent", color: FB.textSecondary, cursor: "pointer" }}><MoreHorizontal size={20} /></button>
              {menuOpen && <ContextMenu isOwn={isOwn} onDelete={() => onDelete?.(post.id)} onOpenPost={() => onOpenPost?.(actionPost)} onClose={() => setMenuOpen(false)} />}
            </div>
            </div>
          </div>
          <div className="pc-header-role" style={{ marginTop: 2, color: FB.textSecondary, fontSize: 12.5 }}>
            Publication entreprise
          </div>
          <div className="pc-header-meta" style={{ marginTop: 2, color: FB.textSecondary, fontSize: 12 }}>
            <RelativeTime date={post.createdAt || post.time} />
          </div>
        </div>
      </div>
      <div className="pc-job-hero" style={{ padding: "20px 22px 18px", background: coverSrc ? `linear-gradient(135deg, rgba(15,51,82,.82), rgba(15,51,82,.62)), url(${coverSrc}) center / cover` : "linear-gradient(135deg, var(--navy900), var(--navy800))", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div className="pc-job-type" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 9px", border: "1px solid rgba(246,211,116,.3)", borderRadius: 999, background: "rgba(246,211,116,.12)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#F6D374" }}><Briefcase size={14} /> {post.jobType || "Offre d'emploi"}</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.68)" }}>Opportunité</span>
        </div>
        <h3 className="pc-job-title" style={{ margin: "14px 0 0", fontSize: 20, lineHeight: 1.25, fontWeight: 800, letterSpacing: "-0.01em" }}>{post.title || post.jobTitle || "Opportunité professionnelle"}</h3>
        {hasMeta && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, fontSize: 12, color: "rgba(255,255,255,.84)" }}>
          {post.contract && <span style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,.1)" }}>{post.contract}</span>}
          {post.loc && <span style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,.1)" }}>{post.loc}</span>}
        </div>
        }
      </div>
      <div className="pc-job-content" style={{ padding: "18px 22px 20px" }}>
        <p style={{ margin: 0, color: C.muted, fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{descriptionPreview}</p>
        {descriptionIsLong && <button type="button" onClick={() => setDescriptionExpanded((expanded) => !expanded)} style={{ marginTop: 7, padding: 0, border: 0, background: "none", color: C.navy800, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          {descriptionExpanded ? "Voir moins" : "Voir plus"}
        </button>}
        <button className="pc-job-cta" type="button" aria-label={ctaLabel} onClick={() => onJobAction?.(post)} disabled={!onJobAction} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 44, marginTop: 18, border: 0, borderRadius: 10, background: `linear-gradient(135deg, ${C.gold400}, ${C.gold600})`, color: C.navy900, fontSize: 13, fontWeight: 800, cursor: onJobAction ? "pointer" : "default", opacity: onJobAction ? 1 : .65, boxShadow: "0 6px 14px rgba(217,165,54,0.22)" }}>
          {ctaLabel} <ArrowRight size={15} />
        </button>
      </div>
      <ReactionBar post={actionPost} onToggleComments={() => onOpenPost?.(actionPost)} onOpenPost={onOpenPost} />
      <div style={{ height: 1, background: FB.divider, margin: "0 16px" }} />
      <ActionBar
        post={actionPost}
        {...jobActionHandlers}
      />
      {showComments && <CommentSection post={actionPost} currentUser={currentUser} onAddComment={addJobComment} onReplyComment={replyJobComment} onToggleCommentLike={onToggleCommentLike} onToggleCommentReaction={toggleJobCommentReaction} />}
      {shareOpen && (
        <ShareModal
          post={post}
          onClose={() => setShareOpen(false)}
          onRepost={() => { repostJob(); setShareOpen(false); }}
        />
      )}
    </article>
  );
}

export default function PostCard({
  post,
  currentUser = { name: "Vous", initials: "V", avatarUrl: null },
  onToggleLike,
  onSelectReaction,
  onToggleBookmark,
  onAddComment,
  onReplyComment,
  onToggleCommentLike,
  onShare,
  onMessage,
  onConnect,
  onRemove,
  onOpenArticle,
  onOpenPost,
  onEditPost,
  onDelete,
  onJoinEvent,
  onOpenEvent,
  isOwn = false,
  group = null,
  onJoinGroup,
  onLeaveGroup,
  onFollowPage,
  followedPageIds = [],
  isCompanyAccount = false,
  commentsLoading: commentsLoadingProp = false,
  variant = "default",
  onJobAction,
}) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [justShared, setJustShared]     = useState(false);
  const [shareOpen, setShareOpen]       = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const mediaItems = normalizeMedia(post.media);
  const currentUserId = currentUser?.id;
  const resolvedVariant = variant === "default" && post?.variant ? post.variant : variant;
  const isPagePost = Boolean((post.authorType === "page" || post.companyPageId || post.pageId || post.title === "Page entreprise" || post.accountType === "company") && !group);
  const pageProfileId = isPagePost ? (post.companyPageId || post.pageId || post.authorId) : null;
  const isSponsored = Boolean(post.isSponsored || post.campaignId);
  const isAnnouncement = Boolean(post.presentation?.type === "announcement" || post.presentation === "announcement" || (typeof post.presentation === "string" && post.presentation.includes('"type":"announcement"')));
  const isOfficialPost = Boolean(post.isPlatformAdmin || isAnnouncement);
  const announcementAuthor = isAnnouncement ? "LynoraLink" : (post.author || "Utilisateur");
  const announcementAvatar = isAnnouncement ? "/logo_lynora.svg" : (post.avatarUrl || null);
  const isOwnPage = isCompanyAccount && isPagePost && String(pageProfileId) === String(currentUserId);
  const isPageFollowed = isPagePost && followedPageIds.some((id) => String(id) === String(pageProfileId));
  const isGroupMember = group && (
    group.ownerId === currentUserId ||
    group.memberIds?.includes(currentUserId) ||
    group.members?.some((member) => member.id === currentUserId)
  );

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleRepost = () => {
    onShare?.(post.id);
    setJustShared(true);
    setTimeout(() => setJustShared(false), 1800);
  };

  const toggleComments = () => {
    setCommentsLoading(false);
    setShowComments((s) => !s);
  };

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

  if (resolvedVariant === "job") return <JobOfferCard post={post} currentUser={currentUser} currentUserId={currentUserId} isOwn={isOwn} onDelete={onDelete} onJobAction={onJobAction} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onReplyComment={onReplyComment} onToggleCommentLike={onToggleCommentLike} onShare={handleShare} onOpenPost={onOpenPost} onFollowPage={onFollowPage} followedPageIds={followedPageIds} justShared={justShared} />;

  return (
    <>
      {/* Styles utilitaires injectés une seule fois via un id */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .pc-sponsored-cta:hover {
          background: var(--navy800) !important;
          color: var(--app-surface) !important;
          border-color: var(--navy800) !important;
          filter: none;
        }
        .pc-sponsored-cta:active {
          transform: scale(0.98);
        }
        .pc-sponsored-cta:focus-visible {
          outline: 3px solid rgba(15, 51, 82, 0.22);
          outline-offset: 2px;
        }
        .pc-sponsored-linkrow:hover {
          background: var(--app-bg) !important;
        }
        @media (max-width: 900px) {
          /* Bouton "…" d'un commentaire : visible seulement au survol sur desktop
             (style inline), donc invisible en permanence sur un vrai téléphone
             (pas de hover tactile). On force son affichage ici. */
          .cm-actions-trigger {
            opacity: 1 !important;
          }
          .pc-share-overlay {
            padding: 0 !important;
            align-items: stretch !important;
          }
          .pc-share-modal {
            width: 100% !important;
            max-width: none !important;
            max-height: 100dvh !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            padding-bottom: env(safe-area-inset-bottom);
          }
          .pc-share-modal input,
          .pc-share-modal textarea {
            font-size: 16px !important;
          }
          .pc-card {
            font-size: 14px !important;
            width: 100vw !important;
            max-width: none !important;
            margin: 0 !important;
            margin-left: calc(50% - 50vw) !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden;
          }
          .pc-card,
          .pc-card.pc-article-card,
          .pc-card.pc-event-card,
          .pc-card.pc-announcement-card {
            border-radius: 0 !important;
          }
          .pc-header-avatar,
          .pc-header-avatar img,
          .pc-header-avatar > div {
            border-radius: 50% !important;
          }
          .pc-group-cover,
          .pc-group-cover img,
          .pc-group-cover > div {
            border-radius: 8px !important;
          }
          .pc-article-cover,
          .pc-article-cover img {
            border-radius: 12px !important;
          }
          .pc-card * {
            box-sizing: border-box;
          }
          .pc-action-label { display: none; }
          .pc-actions {
            gap: 0 !important;
            padding: 4px !important;
          }
          .pc-actions button {
            gap: 4px !important;
            padding-inline: 2px !important;
          }
          .pc-sponsored-text {
            font-size: 14px !important;
          }
          .pc-sponsored-linkrow {
            padding: 8px 12px !important;
          }
          .pc-sponsored-linkinfo span:first-child {
            font-size: 13px !important;
          }
          .pc-sponsored-cta {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .pc-sponsored-secondary {
            gap: 8px !important;
            padding: 8px 12px 10px !important;
          }
          .pc-sponsored-secondary button,
          .pc-sponsored-secondary a {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .pc-header {
            position: relative;
            gap: 8px !important;
            padding: 10px 52px 0 12px !important;
            flex-wrap: nowrap !important;
            align-items: flex-start !important;
          }
          .pc-header-avatar {
            transform: scale(0.9);
          }
          .pc-header-main {
            min-width: 0;
            flex: 1 1 auto;
            overflow: hidden;
          }
          .pc-header-title-row {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .pc-header-name {
            font-size: 14px !important;
            white-space: normal !important;
            line-height: 1.3 !important;
            overflow: visible !important;
            overflow-wrap: anywhere;
          }
          .pc-header-name > a {
            min-width: 0;
            white-space: normal !important;
            overflow: visible !important;
            overflow-wrap: anywhere;
          }
          .pc-header-name > span[aria-label],
          .pc-header-role > span[aria-label] {
            transform: scale(0.82);
            transform-origin: left center;
            margin-right: -16px;
          }
          .pc-header-title-row > button,
          .pc-header-title-row > span {
            height: 20px !important;
            min-height: 20px !important;
            padding: 0 8px !important;
            font-size: 10px !important;
            line-height: 1 !important;
          }
          .pc-header-role {
            font-size: 12px !important;
            white-space: normal !important;
            line-height: 1.35 !important;
          }
          .pc-header-meta {
            row-gap: 3px !important;
            font-size: 11.5px !important;
          }
          .pc-header-actions {
            position: absolute;
            top: 6px;
            right: 8px;
            gap: 4px !important;
            margin-left: auto;
          }
          .pc-header-actions button {
            width: 30px !important;
            height: 30px !important;
            padding: 0 !important;
          }
          .pc-header-actions button svg {
            width: 17px;
            height: 17px;
          }
          .pc-context-menu {
            top: 34px !important;
            right: -4px !important;
            width: min(300px, calc(100vw - 24px)) !important;
            min-width: 0 !important;
            max-width: calc(100vw - 24px) !important;
            padding: 4px !important;
          }
          .pc-context-menu button {
            width: 100% !important;
            height: auto !important;
            gap: 8px !important;
            padding: 7px !important;
          }
          .pc-context-menu button > span:first-child {
            width: 30px !important;
            height: 30px !important;
          }
          .pc-context-menu button > span:last-child {
            flex: 1 1 auto !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            text-align: left;
          }
          .pc-context-menu-label,
          .pc-context-menu-desc {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            overflow-wrap: anywhere;
          }
          .pc-context-menu-label { font-size: 13px !important; }
          .pc-context-menu-desc { font-size: 11px !important; line-height: 1.3; }
          .pc-edit-overlay {
            position: fixed; inset: 0; z-index: 1200; padding: 16px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(15,51,82,0.55); backdrop-filter: blur(2px);
          }
          .pc-edit-modal { width: min(100%, 640px); max-height: 90vh; background: var(--app-surface); color: var(--app-text); border: 1px solid rgba(15,51,82,0.06); border-radius: 22px; overflow: hidden; box-shadow: 0 32px 80px rgba(15,51,82,0.42), 0 2px 0 rgba(255,255,255,0.6) inset; display: flex; flex-direction: column; }
          .pc-edit-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--app-border); background: linear-gradient(180deg, #FCFDFE 0%, #FFFFFF 100%); }
          .pc-edit-modal-header > div { display: flex; flex-direction: column; gap: 3px; }
          .pc-edit-modal-header span { font-family: "Sora", sans-serif; font-size: 16px; font-weight: 800; }
          .pc-edit-modal-header small { color: var(--app-muted); font-size: 12px; }
          .pc-edit-modal-header button { border: 0; background: var(--app-bg); color: var(--app-muted); cursor: pointer; padding: 9px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
          .pc-edit-modal-header button:hover { background: #FBEDED; color: #C24444; }
          .pc-edit-modal-body { position: relative; padding: 18px 24px 16px; overflow-y: auto; }
          .pc-edit-modal textarea { width: 100%; min-height: 170px; resize: vertical; box-sizing: border-box; padding: 16px 18px; border: 1.5px solid var(--app-border); border-radius: 14px; background: #F9FBFD; color: var(--app-text); font: inherit; font-size: 15px; line-height: 1.7; outline: none; box-shadow: inset 0 1px 0 rgba(15,51,82,0.02); transition: border-color 180ms ease, box-shadow 180ms ease; }
          .pc-edit-modal textarea:focus { border-color: #2C6BA0; box-shadow: 0 0 0 3px var(--app-border); }
          .pc-edit-counter { display: block; color: var(--app-muted-light); font-size: 11.5px; text-align: right; margin-top: 6px; }
          .pc-edit-modal-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 14px 24px; border-top: 1px solid var(--app-border); box-shadow: 0 -8px 20px rgba(15,51,82,0.04); background: var(--app-surface); }
          .pc-edit-modal-actions button { border: 0; border-radius: 999px; padding: 10px 20px; font: inherit; font-weight: 700; cursor: pointer; }
          .pc-edit-modal-actions button:first-child { background: transparent; color: var(--app-text); }
          .pc-edit-modal-actions button:last-child { background: linear-gradient(160deg, var(--navy800) 0%, var(--navy900) 100%); color: #fff; box-shadow: 0 8px 20px rgba(15,51,82,0.3); font-family: "Sora", sans-serif; }
          .pc-edit-modal-actions button:disabled { opacity: .55; cursor: default; }
          @media (max-width: 900px) { .pc-edit-overlay { padding: 0; padding-top: env(safe-area-inset-top); align-items: stretch; overflow-y: auto; } .pc-edit-modal { width: 100%; max-width: 100%; height: 100dvh; max-height: none; border-radius: 0; border-left: 0; border-right: 0; overflow: visible; } .pc-edit-modal-header { position: sticky; top: 0; z-index: 2; } .pc-edit-modal-body { flex: 1; } .pc-edit-modal textarea { min-height: 220px; } .pc-edit-modal-actions { padding-bottom: calc(14px + env(safe-area-inset-bottom)); } }
          .pc-body-text {
            font-size: 14px !important;
            line-height: 1.6 !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .pc-body-text button {
            font-size: 13px !important;
          }
          .pc-card > .pc-header + div,
          .pc-card > .pc-header + div > div {
            position: relative;
          }
          .pc-card img,
          .pc-card video {
            max-width: 100%;
          }
          .pc-media-gallery,
          .pc-media-gallery * {
            border-radius: 0 !important;
          }
          .pc-media-gallery-multiple {
            min-height: 0 !important;
            height: auto !important;
          }
          .pc-media-gallery-multiple .pc-media-tile {
            min-height: 0 !important;
            aspect-ratio: 1 / 1;
          }
          .pc-media-gallery-multiple .pc-media-tile img,
          .pc-media-gallery-multiple .pc-media-tile video {
            height: 100% !important;
            min-height: 0 !important;
          }
          .pc-media-gallery-single {
            min-height: 0 !important;
            max-height: none !important;
          }
          .pc-article-title {
            font-size: 18px !important;
            line-height: 1.3 !important;
          }
          .pc-article-excerpt {
            font-size: 13.5px !important;
            line-height: 1.5 !important;
          }
          .pc-article-header {
            display: grid !important;
            grid-template-columns: 40px minmax(0, 1fr) !important;
            column-gap: 8px !important;
            row-gap: 2px !important;
          }
          .pc-article-header .pc-header-main {
            grid-column: 2 !important;
            grid-row: 1 !important;
            min-width: 0 !important;
          }
          .pc-article-header .pc-header-actions {
            grid-column: 2 !important;
            grid-row: 2 !important;
            justify-self: end !important;
            margin: 0 !important;
            width: 100% !important;
            justify-content: flex-end !important;
          }
          .pc-article-header .pc-header-actions button {
            width: 34px !important;
            height: 32px !important;
          }
        }
      `}</style>

      <div
        className={`pc-card${isAnnouncement ? " pc-announcement-card" : ""}${post.isArticle ? " pc-article-card" : ""}${isEventPost(post) ? " pc-event-card" : ""}`}
        style={{
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          background: C.white,
          border: `1px solid ${FB.border}`,
          borderRadius: FB.cardRadius,
          overflow: "hidden",
          boxShadow: FB.cardShadow,
          border: isAnnouncement ? `1px solid rgba(217,165,54,0.55)` : `1px solid ${FB.border}`,
          boxShadow: isAnnouncement ? "0 8px 24px rgba(15,51,82,0.12), 0 0 0 1px rgba(217,165,54,0.08)" : FB.cardShadow,
        }}
      >
        {isAnnouncement && (
          <div className="pc-announcement-ribbon" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "linear-gradient(100deg, #0F3352 0%, #1B5386 72%, #D9A536 100%)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.045em", textTransform: "uppercase" }}>
            <Megaphone size={15} color="#F6D374" />
            <span>Annonce officielle LynoraLink</span>
          </div>
        )}
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={post.isArticle ? "pc-header pc-article-header" : "pc-header"} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px 0" }}>
          {group ? (
            <div style={{ position: "relative", width: 54, height: 46, flexShrink: 0 }}>
              <ProfileHoverPreview type="group" entity={group} isMember={Boolean(isGroupMember)} onJoin={() => onJoinGroup?.(group)} onLeave={() => onLeaveGroup?.(group.id)} fallback={{ name: group.name, coverUrl: group.coverUrl, memberCount: group.memberCount }}>
                <Link href={`/feed?${new URLSearchParams({ view: "groups", groupId: String(group.id) }).toString()}`} aria-label={`Voir le groupe ${group.name}`} onClick={(event) => event.stopPropagation()} style={{ display: "inline-flex", position: "absolute", left: 0, top: 0, width: 42, height: 42, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(15,51,82,0.16)", cursor: "pointer" }}>
                  <div className="pc-group-cover" aria-label={`Couverture de ${group.name}`} style={{ position: "absolute", inset: 0, borderRadius: 8, background: group.coverGradient || navyGrad, backgroundImage: group.coverUrl ? `url(${group.coverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", border: `2px solid ${C.white}`, boxSizing: "border-box", boxShadow: "0 1px 4px rgba(15,51,82,0.16)" }} />
                </Link>
              </ProfileHoverPreview>
              <div style={{ position: "absolute", right: 0, bottom: 0 }}>
                <ProfileHoverPreview type="person" fallback={{ id: post.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, title: post.title }}>
                  <Link href={`/feed?view=profile&userId=${encodeURIComponent(post.authorId || "")}`} aria-label={`Voir le profil de ${announcementAuthor}`} style={{ display: "inline-flex" }}>
                    <Avatar className="pc-header-avatar" initials={isAnnouncement ? "LL" : (post.initials || "L")} size={28} imgUrl={announcementAvatar} ring />
                  </Link>
                </ProfileHoverPreview>
              </div>
            </div>
          ) : (
            <ProfileHoverPreview type={isPagePost ? "page" : "person"} onMessage={onMessage} onConnect={onConnect} onRemove={onRemove} onFollow={onFollowPage} isFollowing={isPageFollowed} fallback={{ id: pageProfileId || post.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, title: post.title, coverUrl: post.pageCoverUrl || post.coverUrl, bio: post.description, location: post.location, website: post.pageWebsite, followersCount: post.followersCount }}>
              <Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(pageProfileId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId || "")}`} aria-label={`Voir le profil de ${announcementAuthor}`} style={{ display: "inline-flex" }}>
                <Avatar className="pc-header-avatar" initials={isAnnouncement ? "LL" : (post.initials || "L")} size={40} imgUrl={announcementAvatar} />
              </Link>
            </ProfileHoverPreview>
          )}

          <div className="pc-header-main" style={{ flex: 1, minWidth: 0, overflow: isSponsored ? "visible" : undefined }}>
            {group ? (
              <>
                <div className="pc-header-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <ProfileHoverPreview type="group" entity={group} isMember={Boolean(isGroupMember)} onJoin={() => onJoinGroup?.(group)} onLeave={() => onLeaveGroup?.(group.id)} fallback={{ name: group.name, coverUrl: group.coverUrl, memberCount: group.memberCount }}>
                    <Link href={`/feed?${new URLSearchParams({ view: "groups", groupId: String(group.id) }).toString()}`} onClick={(event) => event.stopPropagation()} style={{ minWidth: 0, fontSize: 15, fontWeight: 700, color: FB.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "none", cursor: "pointer" }}>
                      <span className="pc-header-name" style={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{group.name}</span>
                    </Link>
                  </ProfileHoverPreview>
                  {isGroupMember ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: C.navy50, color: C.navy800, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      Membre
                    </span>
                  ) : (
                    <button type="button" onClick={() => onJoinGroup?.(group)} style={{ display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: 999, border: `1px solid ${C.navy700}`, background: C.white, color: C.navy800, fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Rejoindre
                    </button>
                  )}
                </div>
                <div className="pc-header-role" style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {post.authorId ? (
                    <ProfileHoverPreview type="person" isMember={Boolean(group && isGroupMember)} onJoin={onJoinGroup} onLeave={onLeaveGroup} fallback={{ id: post.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, title: post.title }}>
                      <Link href={`/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} aria-label={`Voir le profil de ${announcementAuthor}`} style={{ color: "inherit", textDecoration: "none" }}>{announcementAuthor}</Link>
                    </ProfileHoverPreview>
                  ) : announcementAuthor}
                  {!post.isPlatformAdmin && post.isPremium && <PremiumBadge size={13} />}
                  {isOfficialPost && <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />}
                  {(post.role || post.authorTitle || post.title) && (post.role || post.authorTitle || post.title) !== "Membre" && (
                    <span style={{ fontSize: 13, fontWeight: 400, color: FB.textSecondary }}> · {post.role || post.authorTitle || post.title}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="pc-header-title-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="pc-header-name" style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: FB.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <ProfileHoverPreview type={isPagePost ? "page" : "person"} onMessage={onMessage} onConnect={onConnect} onRemove={onRemove} onFollow={onFollowPage} isFollowing={isPageFollowed} fallback={{ id: pageProfileId || post.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, title: post.title, coverUrl: post.pageCoverUrl || post.coverUrl, bio: post.description, location: post.location, website: post.pageWebsite, followersCount: post.followersCount }}>
                      <Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(pageProfileId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId || "")}`} style={{ overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}>{announcementAuthor}</Link>
                    </ProfileHoverPreview>
                    {isOfficialPost && <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" />}
                    {!isOfficialPost && post.isPremium && <PremiumBadge size={14} />}
                  </div>
                  {isPagePost && !isOwnPage && (
                    <button
                      type="button"
                      onClick={() => onFollowPage?.(pageProfileId)}
                      disabled={!onFollowPage}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 8, border: `1px solid ${C.gold600}`, background: isPageFollowed ? "#FFF8E5" : "linear-gradient(135deg, #F6D374, #D9A536)", color: isPageFollowed ? C.navy800 : C.navy900, fontSize: 11, fontWeight: 800, cursor: onFollowPage ? "pointer" : "default", boxShadow: isPageFollowed ? "none" : "0 2px 6px rgba(217,165,54,0.24)" }}
                    >
                      {isPageFollowed ? <><Check size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}
                    </button>
                  )}
                </div>
                <div className="pc-header-role" style={{ fontSize: 13, color: FB.textSecondary, marginTop: 1, whiteSpace: "nowrap", overflow: isSponsored ? "visible" : "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
                  {isSponsored
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.gold600, fontWeight: 700 }}>
                        <span>Sponsorisé</span>
                        <SponsoredInfo />
                      </span>
                    : post.title}
                </div>
              </>
            )}
            <div className="pc-header-meta" style={{ fontSize: 13, color: FB.textSecondary, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", visibility: "visible", height: "auto", overflow: "hidden" }}>
              <RelativeTime date={post.time || post.createdAt} />
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
            <PostContextMeta post={post} currentUserId={currentUserId} />
          </div>

          {/* Actions header */}
          <div className="pc-header-actions" style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {post.isArticle && onOpenArticle && (
              <button
                onClick={() => onOpenArticle(post)}
                title="Lire l'article"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", color: FB.textSecondary, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = FB.hover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <BookOpen size={18} />
              </button>
            )}
            {/* Menu "…" */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={openMenu}
                title="Plus d'options"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", color: FB.textSecondary, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = FB.hover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <MoreHorizontal size={20} />
              </button>
              {menuOpen && (
                <ContextMenu
                  isOwn={isOwn}
                  onEdit={isOwn && !isSponsored && onEditPost ? () => setEditOpen(true) : null}
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
        {post.isArticle ? (
          <ArticleBanner post={post} onOpenArticle={onOpenArticle} />
        ) : isEventPost(post) ? (
          <>
            <PostText text={post.text} />
            <EventBanner post={{ ...post, currentUserId }} onJoinEvent={onJoinEvent} onOpenEvent={onOpenEvent} />
          </>
        ) : isFilePost(post) ? (
          <>
            <PostText text={post.text || post.fileDescription || post.file?.description || post.attachment?.description} />
            <FileBanner post={post} onOpenPost={onOpenPost} />
            {mediaItems.length > 0 && (
              <div style={{ padding: "0 0 4px" }}>
                <MediaGallery items={mediaItems} onOpenPost={onOpenPost ? () => onOpenPost(post) : null} />
              </div>
            )}
          </>
        ) : (
          <>
            {isSponsored ? <SponsoredDetails post={post} onOpenPost={onOpenPost} onMessage={onMessage} /> : <>
              <PostText text={post.text} />
              {post.type === "shared-post" && <SharedPostBanner post={post} />}
              {mediaItems.length > 0 && (
                <div style={{ padding: "0 0 4px" }}>
                  <MediaGallery items={mediaItems} onOpenPost={onOpenPost ? () => onOpenPost(post) : null} />
                </div>
              )}
            </>}
          </>
        )}

        {/* ── Compteurs ─────────────────────────────────────────────── */}
        <ReactionBar post={post} onToggleComments={toggleComments} onOpenPost={onOpenPost} />

        {/* ── Séparateur ────────────────────────────────────────────── */}
        <div style={{ height: 1, background: FB.divider, margin: "0 16px" }} />

        {/* ── Barre d'actions ───────────────────────────────────────── */}
        <ActionBar
          post={post}
          onToggleLike={onToggleLike}
          onSelectReaction={onSelectReaction}
          onToggleBookmark={onToggleBookmark}
          onShare={handleShare}
          onToggleComments={toggleComments}
          onOpenPost={onOpenPost}
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
            onToggleCommentLike={onToggleCommentLike}
            commentsLoading={commentsLoading || commentsLoadingProp}
          />
        )}

        {/* ── MODAL PARTAGE ── */}
        {shareOpen && (
          <ShareModal
            post={post}
            group={group}
            onClose={() => setShareOpen(false)}
            onRepost={handleRepost}
          />
        )}
      </div>
      {editOpen && (
        <CreatePostModal
          initialMode={post.isArticle ? "article" : "post"}
          initialText={post.text || ""}
          initialArticleTitle={post.headline || post.title || ""}
          initialArticleExcerpt={post.excerpt || ""}
          initialMedia={mediaItems}
          initialVisibility={post.visibility || post.audience || "Public"}
          initialMood={post.mood || null}
          initialIdentifiedUsers={post.identifiedUsers || []}
          initialTags={post.tags || []}
          isEditing
          currentUser={{
            name: currentUser?.name || "Utilisateur",
            title: currentUser?.title || "Membre LynoraLink",
            avatar: currentUser?.initials || "U",
            avatarUrl: currentUser?.avatarUrl || null,
            isPlatformAdmin: Boolean(currentUser?.isPlatformAdmin),
            isPremium: Boolean(currentUser?.isPremium),
          }}
          onClose={() => setEditOpen(false)}
          onPublish={async (payload) => {
            await onEditPost?.(post.id, payload.text.trim(), payload.visibility);
            setEditOpen(false);
          }}
        />
      )}
    </>
  );
}
