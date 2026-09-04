"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp, faLinkedin, faFacebook, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import {
  X, Globe, Lock, Users2, MoreHorizontal, ThumbsUp, MessageCircle, Briefcase, MapPin, Megaphone,
  Share2, Send, Smile, ChevronDown, ChevronUp, Search, Check, Mail, ExternalLink, PlayCircle, Image as ImageIcon,
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Bookmark, Clock, Pencil, Trash2, Flag, Link2,
  BellOff, EyeOff, Copy, Camera, ListFilter, UserPlus, FileText, Download, Info,
} from "lucide-react";
import ReactionPicker from "@/components/ReactionPicker";
import Emojipicker from "@/components/Emojipicker";
import RelativeTime from "@/components/RelativeTime";
import { CommentSkeleton } from "@/components/Skeleton";
import EnterpriseBadge from "./EnterpriseBadge";
import PremiumBadge from "./PremiumBadge";
import ProfileHoverPreview from "./ProfileHoverPreview";
import { fetchBackendApi } from "@/lib/backend-api";

/* ------------------------------------------------------------------ */
/*  TOKENS                                                            */
/* ------------------------------------------------------------------ */
const LINKEDIN_BLUE = "#0a66c2";
const LI_BORDER = "var(--app-border)";
const LI_INPUT_BORDER = "var(--app-border)";
const LI_HOVER = "var(--app-input)";
const LI_TEXT = "var(--app-text)";
const LI_SECONDARY = "var(--app-muted)";
const LI_DIVIDER = "var(--app-border)";

const C = {
  navy900: "#0F3352", navy800: "#1B5386", navy700: "#2C6BA0",
  navy100: "var(--app-border)", navy50: "var(--app-bg)",
  gold400: "#F6D374", gold600: "#D9A536",
  ink: "var(--app-text)", muted: "var(--app-muted)", mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)", white: "var(--app-surface)",
  danger: "#C24444", danger50: "#FBEDED", success: "#2E9E5B",
};
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* ------------------------------------------------------------------ */
/*  REACTIONS                                                         */
/* ------------------------------------------------------------------ */
const REACTIONS = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png", icon: ThumbsUp, color: C.white },
  { key: "love", label: "Love", src: "/emoji_picker/love.png", icon: ThumbsUp, color: "#C24444" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png", icon: ThumbsUp, color: C.muted },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png", icon: ThumbsUp, color: C.gold600 },
  { key: "colere", label: "Col\u00e8re", src: "/emoji_picker/colere.png", icon: ThumbsUp, color: "#C24444" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png", icon: ThumbsUp, color: "#C97A2E" },
];
const REACTION_KEY_ALIASES = { like: "ok", j_aime: "ok", "j'aime": "ok" };
function normalizeReactionKey(key) { return REACTION_KEY_ALIASES[String(key || "").trim().toLowerCase()] || String(key || "").trim().toLowerCase(); }
const reactionByKey = (key) => REACTIONS.find((r) => r.key === normalizeReactionKey(key));
const LIKE_REACTION = REACTIONS[0];

function getEngagementReactions(post, userReaction) {
  const counts = post.reactions;
  let keys = [];
  if (Array.isArray(counts)) keys = counts.map((item) => typeof item === "string" ? item : item?.key || item?.reaction || item?.reactionKey || item?.type).filter(Boolean);
  else if (counts && typeof counts === "object") keys = Object.entries(counts).filter(([, c]) => Array.isArray(c) ? c.length > 0 : Number(c) > 0).sort(([, a], [, b]) => (Array.isArray(b) ? b.length : Number(b)) - (Array.isArray(a) ? a.length : Number(a))).map(([k]) => k);
  keys = keys.map(normalizeReactionKey);
  const normalizedUserReactions = (Array.isArray(userReaction) ? userReaction : [userReaction]).map(normalizeReactionKey).filter(Boolean);
  normalizedUserReactions.reverse().forEach((rk) => { if (!keys.includes(rk)) keys.unshift(rk); });
  if (keys.length === 0 && Number(post.likes) > 0) return [LIKE_REACTION];
  const mappedReactions = [...new Set(keys)].map((k) => reactionByKey(k)).filter(Boolean).filter((r, i, a) => a.findIndex((x) => x.key === r.key) === i).slice(0, 3);
  return mappedReactions.length > 0 ? mappedReactions : (Number(post.likes) > 0 ? [LIKE_REACTION] : []);
}

function readingTime(text = "") { return Math.max(1, Math.round(text.trim().split(/\s+/).filter(Boolean).length / 200)); }
function formatCount(n = 0) { return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} k` : String(n); }
function countComments(comments = []) { return comments.reduce((t, c) => t + 1 + countComments(c.replies || []), 0); }
function filterHiddenComments(comments = [], hiddenIds = []) {
  return comments
    .filter((comment) => !hiddenIds.includes(String(comment.id)))
    .map((comment) => ({ ...comment, replies: filterHiddenComments(comment.replies || [], hiddenIds) }));
}
function normalizeMedia(raw) { if (!raw) return []; return Array.isArray(raw) ? raw : [raw]; }
function decorateJobComments(comments, userId) {
  return comments.map((comment) => {
    const reactions = comment.reactions && typeof comment.reactions === "object" ? comment.reactions : {};
    const reaction = Object.entries(reactions).find(([, ids]) => Array.isArray(ids) && ids.includes(userId))?.[0] || null;
    const reactionKeys = Object.entries(reactions).filter(([, ids]) => Array.isArray(ids) && ids.length > 0).sort(([, first], [, second]) => second.length - first.length).map(([key]) => key).slice(0, 3);
    const totalReactions = Object.values(reactions).reduce((total, ids) => total + (Array.isArray(ids) ? ids.length : 0), 0);
    return { ...comment, reaction, reactionKeys, totalReactions, replies: decorateJobComments(comment.replies || [], userId) };
  });
}

function getReactionCount(post) {
  const r = post.reactions;
  if (Array.isArray(r)) return r.reduce((s, i) => s + (typeof i === "object" ? Number(i.count || 0) : 1), 0) || Number(post.likes || 0);
  if (r && typeof r === "object") return Object.values(r).reduce((s, c) => s + (Array.isArray(c) ? c.length : Number(c || 0)), 0) || Number(post.likes || 0);
  return Number(post.likes || 0);
}

function getRepostCount(post) {
  if (typeof post.reposts === "number") return post.reposts;
  if (typeof post.shares === "number") return post.shares;
  return 0;
}

function isFilePost(post) {
  const fileTypes = ["file", "document", "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx"];
  return post?.isFile || fileTypes.includes(post?.type) || Boolean(post?.file || post?.attachment || post?.fileUrl || post?.fileName);
}

function PostContextMeta({ post, currentUserId }) {
  const identifiedUsers = Array.isArray(post?.identifiedUsers) ? post.identifiedUsers.filter((user) => user?.name) : [];
  if (!post?.mood?.emoji && identifiedUsers.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 6, color: LI_SECONDARY, fontSize: 12 }}>
      {post?.mood?.emoji && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "#FFF7E0", color: "#8A6418", fontWeight: 700 }}>{post.mood.emoji} {post.mood.label || "Humeur"}</span>}
      {identifiedUsers.slice(0, 5).map((user, index) => user.id === currentUserId ? (
        <span key={user.id || `${user.name}-${index}`} style={{ color: LINKEDIN_BLUE, fontWeight: 700 }}>vous</span>
      ) : user.id ? (
        <Link key={user.id || `${user.name}-${index}`} href={`/feed?view=profile&userId=${encodeURIComponent(user.id)}`} style={{ color: LINKEDIN_BLUE, fontWeight: 700, textDecoration: "none" }}>@{user.name}</Link>
      ) : <span key={`${user.name}-${index}`} style={{ color: LINKEDIN_BLUE, fontWeight: 700 }}>@{user.name}</span>)}
      {identifiedUsers.length > 5 && <span>+{identifiedUsers.length - 5}</span>}
    </div>
  );
}

function FileViewerBanner({ post }) {
  const file = post?.file || post?.attachment || post;
  const fileUrl = file?.url || file?.fileUrl || post?.fileUrl;
  const fileName = file?.name || file?.fileName || post?.fileName || "Fichier partagé";
  const fileSize = file?.size || post?.fileSize || file?.mimeType || "Document partagé par le groupe";

  return (
    <div style={{ margin: "0 24px 20px", padding: "28px 24px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 13, border: `1px solid ${LI_BORDER}`, borderRadius: 0, background: "linear-gradient(145deg, #F7FAFC 0%, var(--app-bg) 100%)", textAlign: "center" }}>
      <div style={{ width: 96, height: 96, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, rgba(27,83,134,.14), rgba(27,83,134,.06))", color: C.navy800, boxShadow: "0 12px 28px rgba(27,83,134,.12)" }}>
        <FileText size={56} strokeWidth={1.6} />
      </div>
      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ color: LI_TEXT, fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
        <div style={{ marginTop: 5, color: LI_SECONDARY, fontSize: 13 }}>{fileSize}</div>
      </div>
      {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" download={fileName} aria-label={`Télécharger ${fileName}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 9, background: C.navy800, color: C.white, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}><Download size={16} /> Télécharger</a>}
    </div>
  );
}

/* ---- Sponsored-ad helpers (collapse text + action label) ---- */
const SP_TEXT_THRESHOLD = 240; // caracteres max avant troncature
const SP_TEXT_MAX_LINES = 6;   // lignes max avant troncature

function spTruncateText(text, { charLimit, lineLimit }) {
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

function sponsoredActionLabel(post) {
  if (post?.objective === "conversions") return "S'inscrire";
  const website = sponsoredUrl(post?.website);
  if (post?.objective === "clics" && website) return "Visiter";
  const whatsapp = String(post?.whatsapp || "").replace(/\D/g, "");
  if (whatsapp && !website) return "WhatsApp";
  return "Découvrir";
}

function sponsoredUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; }
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
        <span role="status" style={{ position: "absolute", zIndex: 20, top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: "min(230px, calc(100vw - 48px))", padding: "10px 12px", borderRadius: 8, background: C.navy800, color: "#fff", fontSize: 12, lineHeight: 1.4, fontWeight: 500, textAlign: "left", whiteSpace: "normal", boxShadow: "0 6px 18px rgba(15,51,82,0.22)" }}>
          Cette publication est sponsorisée par LynoraLink.
        </span>
      )}
    </span>
  );
}

function SponsoredViewerCard({ post }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const website = sponsoredUrl(post?.website);
  const whatsapp = String(post?.whatsapp || "").replace(/\D/g, "");
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp}` : null;
  const actionUrl = website || whatsappUrl || null;
  const actionLabel = sponsoredActionLabel(post);
  const media = normalizeMedia(post?.media);

  // --- Description avec repli "Voir plus / Voir moins" ---
  const description = post?.excerpt || post?.campaignDescription || post?.text || "";
  const descriptionLineCount = description.split("\n").length;
  const descriptionIsLong = description.length > SP_TEXT_THRESHOLD || descriptionLineCount > SP_TEXT_MAX_LINES;
  const descriptionPreview = descriptionIsLong
    ? spTruncateText(description, { charLimit: SP_TEXT_THRESHOLD, lineLimit: SP_TEXT_MAX_LINES }).truncated
    : description;
  const ellipsis = "\u2026";
  const displayedDescription = descriptionIsLong && !descriptionExpanded ? `${descriptionPreview}${ellipsis}` : description;

  // --- Headline + domaine ---
  const headline = post?.headline || post?.campaignTitle || post?.title || "";
  let displayDomain = "lynoralink.com";
  if (website) {
    try { displayDomain = new URL(website).hostname.replace(/^www\./, ""); } catch {}
  }

  // CTA principal -- identite navy/dore de LynoraLink
  const ctaStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "8px 16px", borderRadius: 8,
    border: `1px solid ${C.gold600}`, fontSize: 13, lineHeight: 1,
    fontWeight: 800, textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap",
    color: C.navy800, background: C.gold400,
    boxShadow: "0 1px 3px rgba(15,51,82,0.12)",
    transition: "background 160ms ease, filter 160ms ease, transform 160ms ease",
  };

  const CtaElement = actionUrl ? (
    <a
      className="pv-sponsored-cta"
      href={actionUrl}
      target="_blank"
      rel="noreferrer"
      style={ctaStyle}
    >{actionLabel}</a>
  ) : (
    <div className="pv-sponsored-cta" style={ctaStyle}>{actionLabel}</div>
  );

  return (
    <div
      className="post-viewer-sponsored-card pv-sponsored-block"
      style={{ display: "flex", flexDirection: "column", margin: "8px 24px 20px" }}
    >
      {/* En-tete "Sponsorise" facon Facebook + icone Info */}
      <div className="pv-sponsored-header" style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 16px 6px" }}>
        <span style={{ color: C.gold600, fontSize: 13, fontWeight: 700, letterSpacing: ".01em" }}>Sponsorisé</span>
        <SponsoredInfo />
      </div>

      {/* Texte principal (au-dessus de l'image) avec "Voir plus / Voir moins" */}
      {description && (
        <div
          className="pv-sponsored-text"
          style={{ padding: "4px 16px 12px", color: LI_TEXT, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {displayedDescription}
          {descriptionIsLong && (
            <button
              type="button"
              className="pv-sponsored-toggle"
              onClick={() => setDescriptionExpanded((value) => !value)}
              style={{
                display: descriptionExpanded ? "block" : "inline",
                marginTop: descriptionExpanded ? 6 : 0,
                marginLeft: descriptionExpanded ? 0 : 6,
                background: "none", border: "none", padding: 0, cursor: "pointer",
                color: C.navy800, fontWeight: 700, fontSize: 15, textDecoration: "none",
              }}
              aria-expanded={descriptionExpanded}
            >
              {descriptionExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>
      )}

      {/* Image / video pleine largeur */}
      {media.length > 0 && <MediaGallery items={media} />}

      {/* Ligne "headline + domaine + bouton CTA" facon Facebook */}
      <div
        className="pv-sponsored-linkrow"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "10px 16px", background: LI_HOVER,
          borderTop: `1px solid ${LI_BORDER}`, borderBottom: `1px solid ${LI_BORDER}`,
        }}
      >
        <div className="pv-sponsored-linkinfo" style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline || "Publicité"}</span>
          <span style={{ fontSize: 12, color: LI_SECONDARY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayDomain}</span>
        </div>
        {CtaElement}
      </div>

      {/* Actions secondaires discretes (WhatsApp) */}
      {whatsappUrl && (
        <div className="pv-sponsored-secondary" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 14px" }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="pv-sponsored-wa"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
              border: `1px solid ${LI_BORDER}`, background: C.white, color: "#127A3D",
              fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer",
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PRIMITIVES                                                        */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 44, imgUrl = null, gradient = navyGrad }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: imgUrl ? C.navy100 : gradient, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", flexShrink: 0, overflow: "hidden" }}>
      {imgUrl ? <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials}
    </div>
  );
}

function ReactionIcon({ reaction = LIKE_REACTION, selected = false, size = 22 }) {
  return (
    <span style={{ width: size + 10, height: size + 10, borderRadius: "50%", border: selected ? `2px solid ${C.gold600}` : `1px solid ${C.line}`, background: selected ? "rgba(217,165,54,0.18)" : "#F8FBFF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <img src={reaction.src} alt={reaction.label} style={{ width: size, height: size, objectFit: "contain", borderRadius: 6 }} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MEDIA GALLERY                                                     */
/* ------------------------------------------------------------------ */
// Le média affiché conserve ses proportions naturelles (pas de recadrage) :
// le conteneur ne descend jamais sous sa hauteur habituelle, mais s'il est
// plus grand que le média, l'espace restant est comblé par le fond (noir)
// plutôt que d'étirer/rogner le média — même règle que la carte du fil.
const VIEWER_MEDIA_MIN_HEIGHT = 360;
const VIEWER_MEDIA_MAX_HEIGHT = 560;

function MediaGallery({ items = [] }) {
  const count = items.length;
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [count]);
  if (count === 0) return null;
  const currentItem = items[activeIndex];
  const showPrevious = () => setActiveIndex((index) => (index - 1 + count) % count);
  const showNext = () => setActiveIndex((index) => (index + 1) % count);
  const renderItem = (item, index) => {
    if (!item?.url) {
      return <div key={index} style={{ width: "100%", height: "100%", background: navyGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,0.9)", padding: 16, textAlign: "center" }}><span style={{ fontSize: 12.5, fontWeight: 600 }}>{item?.label || item?.name || "M\u00e9dia"}</span></div>;
    }
    const mediaStyle = {
      width: "auto",
      maxWidth: "100%",
      height: "auto",
      maxHeight: `min(${VIEWER_MEDIA_MAX_HEIGHT}px, 60vh)`,
      objectFit: "contain",
      objectPosition: "center center",
      display: "block",
      background: "#000",
      margin: "0 auto",
    };
    if (item.type === "video") return <video key={index} src={item.url} controls style={mediaStyle} />;
    return <img key={index} src={item.url} alt={item.label || `M\u00e9dia ${index + 1}`} style={mediaStyle} />;
  };
  return (
    <div style={{ borderRadius: 0, overflow: "hidden", margin: 0 }}>
      <div
        className="post-viewer-media"
        style={{
          position: "relative",
          minHeight: VIEWER_MEDIA_MIN_HEIGHT,
          height: `min(${VIEWER_MEDIA_MAX_HEIGHT}px, 60vh)`,
          maxHeight: `min(${VIEWER_MEDIA_MAX_HEIGHT}px, 60vh)`,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          borderRadius: 0,
        }}
      >
        {renderItem(currentItem, activeIndex)}
          {count > 1 && (
            <>
              <button
                type="button"
                className="post-viewer-slider-button post-viewer-slider-previous"
                onClick={showPrevious}
                aria-label="Média précédent"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="post-viewer-slider-button post-viewer-slider-next"
                onClick={showNext}
                aria-label="Média suivant"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
      </div>
      {count > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "8px 0 0" }}>
          {items.map((item, index) => (
            <button key={index} onClick={() => setActiveIndex(index)} style={{ flex: 1, height: 48, padding: 0, border: index === activeIndex ? `2px solid ${LINKEDIN_BLUE}` : `1px solid ${LI_BORDER}`, borderRadius: 8, overflow: "hidden", background: LI_HOVER, cursor: "pointer", opacity: index === activeIndex ? 1 : 0.7 }}>
              {item?.url && item.type !== "video" ? <img src={item.url} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }} /> : <div style={{ width: "100%", height: "100%", background: navyGrad }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST & CONFIRM DIALOGS                                            */
/* ------------------------------------------------------------------ */
function Toast({ message, icon: Icon }) {
  return (
    <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 400, display: "flex", alignItems: "center", gap: 8, background: "#16232C", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 500, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
      {Icon && <Icon size={14} style={{ color: C.gold400, flexShrink: 0 }} />}
      {message}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: C.white, borderRadius: 12, padding: 22, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: LI_TEXT, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: LI_SECONDARY, lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "transparent", color: LI_SECONDARY, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: danger ? C.danger : LINKEDIN_BLUE, color: C.white, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  REACTION BUTTON WITH PICKER                                         */
/* ------------------------------------------------------------------ */
function ReactionButton({ reaction, onReact, onToggleLike }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);
  // L'ouverture au survol ne fonctionne que sur desktop (souris) : un vrai
  // smartphone n'a pas de hover. On ajoute un appui long comme équivalent tactile.
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const scheduleClose = () => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 260); };
  const cancelClose = () => clearTimeout(closeTimer.current);
  const current = reaction ? reactionByKey(reaction) : null;
  const isLiked = !!reaction;

  const handleTouchStart = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      cancelClose();
      setOpen(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 380);
  };
  const handleTouchEnd = (event) => {
    clearTimeout(longPressTimer.current);
    if (longPressFired.current) event.preventDefault();
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", flex: "1 1 0", minWidth: 0 }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {open && (
        <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={{ position: "absolute", bottom: "100%", left: -10, marginBottom: 6, zIndex: 20 }}>
          <ReactionPicker selectedKey={current?.key} onSelect={(key) => { onReact(key); setOpen(false); }} />
        </div>
      )}
      <button className="post-viewer-action-btn" onClick={onToggleLike} style={{ width: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 4px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", color: isLiked ? C.gold600 : C.muted, fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        {current ? <ReactionIcon reaction={current} selected size={22} /> : <ThumbsUp size={22} color={C.muted} />}
        <span>J'aime</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LINKEDIN-STYLE ACTION BUTTON                                     */
/* ------------------------------------------------------------------ */
function LIActionBtn({ icon: Icon, label, active, onClick }) {
  const color = active ? LINKEDIN_BLUE : LI_SECONDARY;
  return (
    <button className="post-viewer-action-btn" onClick={onClick} style={{ width: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", border: "none", background: "transparent", cursor: "pointer", color, fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", borderRadius: 10, transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={16} fill={active ? LINKEDIN_BLUE : "none"} color={color} />
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  MORE MENU                                                         */
/* ------------------------------------------------------------------ */
function MoreMenu({ isOwn, onEdit, onDelete, onReport, onCopyLink, onClose }) {
  const Item = ({ label, onClick: onClk, danger }) => (
    <button onClick={onClk} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: danger ? C.danger : LI_TEXT, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : LI_HOVER)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{label}</button>
  );
  return (
    <div style={{ position: "absolute", top: 40, right: 0, width: 240, background: C.white, borderRadius: 8, border: `1px solid ${LI_BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 30, overflow: "hidden", padding: "4px 0" }}>
      {isOwn ? (<><Item label="Modifier la publication" onClick={onEdit} /><Item label="Supprimer la publication" danger onClick={onDelete} /></>) : <Item label="Signaler cette publication" danger onClick={onReport} />}
      <div style={{ height: 1, background: LI_BORDER, margin: "4px 0" }} />
      <Item label="Copier le lien" onClick={onCopyLink} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SHARE MODAL                                                       */
/* ------------------------------------------------------------------ */
export function ShareModal({ post, onClose, onRepost, shareUrl: shareUrlOverride = null }) {
  const [tab, setTab] = useState("message");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const postUrl = shareUrlOverride || (typeof window === "undefined" ? "" : `${window.location.origin}/feed?post=${encodeURIComponent(post.id)}${post?.isArticle || post?.headline ? "&article=1" : ""}`);
  const shareText = post?.text || post?.headline || "Découvrez cette publication sur LynoraLink.";
  const sharedAttachments = [
    ...(post?.isArticle || post?.headline ? [{
      type: "article",
      url: postUrl,
      name: post.headline || "Article LynoraLink",
      title: post.headline || "Article LynoraLink",
      text: post.excerpt || shareText,
      thumbnail: post.coverUrl || null,
    }] : []),
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
      onRepost?.();
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
      onRepost?.();
      setStatus(`Publication partagée dans ${selectedGroup.name}.`);
      setTimeout(onClose, 700);
    } catch {
      setStatus("Le partage dans ce groupe est impossible.");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(postUrl);
    onRepost?.();
    setStatus("Lien copié.");
  };

  return (
    <div className="post-share-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }} onClick={onClose}>
      <div className="post-share-modal" onClick={(event) => event.stopPropagation()} style={{ width: "95%", maxWidth: 460, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", background: C.white, borderRadius: 22, boxShadow: "0 30px 60px rgba(0,0,0,.22)" }}>
        <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1B5E40 0%, #122318 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Share2 size={18} style={{ color: C.gold400 }} />
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 600, color: C.white, margin: 0 }}>Partager la publication</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} style={{ color: C.white }} /></button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexShrink: 0, overflowX: "auto" }}>
          {[{ key: "message", label: "Message", icon: Send }, { key: "group", label: "Groupe", icon: Users2 }, { key: "social", label: "Réseaux", icon: ExternalLink }].map(({ key, label, icon: Icon }) => (
            <button type="button" key={key} onClick={() => { setTab(key); setStatus(""); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 4px 11px", border: "none", borderBottom: `2px solid ${tab === key ? C.navy800 : "transparent"}`, background: "transparent", fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, color: tab === key ? C.navy800 : C.mutedLight, cursor: "pointer", marginRight: 18, whiteSpace: "nowrap" }}><Icon size={13} />{label}</button>
          ))}
        </div>
        <div style={{ padding: "16px 24px 24px", overflowY: "auto", fontFamily: "'Sora', sans-serif" }}>
          {tab === "message" && <>
            <label style={{ display: "block", marginBottom: 8, color: C.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Membres de la plateforme</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: LI_HOVER }}><Search size={13} color={C.mutedLight} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13 }} /></div>
            <div style={{ maxHeight: 210, minHeight: 120, overflowY: "auto", padding: "4px 0" }}>{filteredUsers.map((user) => { const selected = selectedUsers.some((selectedUser) => selectedUser.id === user.id); return <button type="button" key={user.id} onClick={() => setSelectedUsers((current) => selected ? current.filter((selectedUser) => selectedUser.id !== user.id) : [...current, user])} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", borderRadius: 12, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2 }}><Avatar initials={(user.name || "U").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()} imgUrl={user.image} size={34} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>{user.name}</span><span style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{selected ? <Check size={12} color={C.white} /> : null}</span></button>; })}</div>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ajouter un message (facultatif)" rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, resize: "vertical", background: LI_HOVER, fontFamily: "inherit", fontSize: 13 }} />
            <div style={{ padding: "14px 0 0", marginTop: 4, borderTop: `1px solid ${C.line}` }}><button type="button" disabled={!selectedUsers.length} onClick={sendMessage} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", border: "none", borderRadius: 11, background: navyGrad, color: C.white, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: selectedUsers.length ? "pointer" : "not-allowed", opacity: selectedUsers.length ? 1 : .55 }}><Send size={14} />Envoyer à {selectedUsers.length || "..."} destinataire{selectedUsers.length > 1 ? "s" : ""}</button></div>
          </>}
          {tab === "group" && <>
            <p style={{ margin: "0 0 12px", color: LI_SECONDARY, fontSize: 13 }}>Choisissez un groupe dont vous êtes membre.</p>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>{shareableGroups.map((group) => {
              const groupCoverUrl = group.coverUrl || group.cover || group.bannerUrl || group.backgroundImage || group.avatarUrl || null;
              const isSelected = selectedGroup?.id === group.id;
              return (
                <button type="button" key={group.id} onClick={() => setSelectedGroup(group)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 10, border: "none", borderRadius: 8, background: isSelected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span aria-hidden="true" style={{ width: 48, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, overflow: "hidden", background: group.coverGradient || navyGrad, backgroundImage: groupCoverUrl ? `url(${groupCoverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", color: C.white, fontSize: 20, boxShadow: "0 1px 3px rgba(0,0,0,.14)" }}>{!groupCoverUrl && (group.emoji || "🌐")}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>{group.name}</span>
                  {isSelected && <Check size={16} color={LINKEDIN_BLUE} />}
                </button>
              );
            })}</div>
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
            ].map(([label, href, icon, color]) => <a key={label} href={href} onClick={() => onRepost?.()} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" aria-label={label} title={label} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11, border: `1px solid ${LI_BORDER}`, borderRadius: 10, color: LI_TEXT, textDecoration: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{icon ? <FontAwesomeIcon icon={icon} style={{ color, fontSize: 16 }} /> : <Mail size={16} color={color} />}{label === "X" ? null : label}</a>)}</div>
          </>}
          {status && <div role="status" style={{ marginTop: 14, textAlign: "center", color: status.includes("impossible") || status.includes("pas pu") ? "#b42318" : LINKEDIN_BLUE, fontSize: 12.5, fontWeight: 600 }}>{status}</div>}
          {tab === "message" && <button type="button" onClick={() => { onRepost?.(); onClose(); }} style={{ width: "100%", marginTop: 16, padding: 10, border: `1px solid ${LI_BORDER}`, borderRadius: 8, background: C.white, color: LI_TEXT, fontWeight: 700, cursor: "pointer" }}><Share2 size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />Republier sur mon profil</button>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  POST TEXT WITH HASHTAGS                                           */
/* ------------------------------------------------------------------ */
function PostText({ text }) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return (
    <div style={{ fontSize: 15, lineHeight: 1.55, color: LI_TEXT, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) =>
        /^#\w+/.test(part) ? (
          <span key={i} style={{ color: LINKEDIN_BLUE, fontWeight: 600 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VISIBILITY ICON                                                   */
/* ------------------------------------------------------------------ */
function VisibilityIcon({ visibility }) {
  const v = (visibility || "public").toLowerCase();
  if (v === "private" || v === "connections") return <Users2 size={14} style={{ color: LI_SECONDARY }} />;
  if (v === "locked" || v === "only_me") return <Lock size={14} style={{ color: LI_SECONDARY }} />;
  return <Globe size={14} style={{ color: LI_SECONDARY }} />;
}

/* ------------------------------------------------------------------ */
/*  COMMENT ITEM                                                      */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  COMMENT ITEM                                                      */
/* ------------------------------------------------------------------ */
function CommentItem({ comment, currentUser, onToggleLike, onReply, onStartReply, onToggleCommentReaction, onReportComment, onHideComment, onEditComment, onDeleteComment, postId, postAuthorId, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReaction, setLocalReaction] = useState(comment.reaction || null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [displayText, setDisplayText] = useState(comment.text || "");
  const reactionBtnRef = useRef(null);
  const reactionCloseTimer = useRef(null);
  const commentLongPressTimer = useRef(null);
  const commentLongPressFired = useRef(false);
  const submitReply = () => { if (!replyText.trim()) return; onReply(comment.id, replyText.trim()); setReplyText(""); setReplying(false); };
  const cInitials = comment.initials || (comment.author || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const commentAuthorId = comment.authorId || comment.userId || comment.author?.id;
  const isPostAuthorComment = Boolean(postAuthorId && commentAuthorId && String(commentAuthorId) === String(postAuthorId));

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClick = (e) => {
      if (reactionBtnRef.current && !reactionBtnRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showReactionPicker]);

  const handleCommentTouchStart = () => {
    commentLongPressFired.current = false;
    commentLongPressTimer.current = window.setTimeout(() => {
      commentLongPressFired.current = true;
      setShowReactionPicker(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 380);
  };
  const handleCommentTouchEnd = (event) => {
    clearTimeout(commentLongPressTimer.current);
    if (commentLongPressFired.current) event.preventDefault();
  };

  const handleReactionSelect = async (reactionKey) => {
    const newReaction = localReaction === reactionKey ? null : reactionKey;
    setLocalReaction(newReaction);
    setShowReactionPicker(false);
    
    // Call API to save reaction
    if (onToggleCommentReaction) {
      try {
        await onToggleCommentReaction(postId, comment.id, reactionKey);
      } catch (error) {
        console.error("Erreur lors de la réaction au commentaire:", error);
        // Revert on error
        setLocalReaction(localReaction);
      }
    }
  };
  const scheduleReactionClose = () => {
    clearTimeout(reactionCloseTimer.current);
    reactionCloseTimer.current = window.setTimeout(() => setShowReactionPicker(false), 180);
  };
  const keepReactionPickerOpen = () => clearTimeout(reactionCloseTimer.current);

  useEffect(() => {
    setLocalReaction(comment.reaction || null);
  }, [comment.reaction]);

  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        {comment.authorId ? (
          <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || comment.authorId) : comment.authorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}>
            <Link href={comment.authorType === "page" ? `/feed?view=company&pageId=${encodeURIComponent(comment.companyPageId || comment.authorId)}` : `/feed?view=profile&userId=${encodeURIComponent(comment.authorId)}`} aria-label={`Voir ${comment.authorType === "page" ? "la page" : "le profil"} de ${comment.author}`} style={{ display: "inline-flex", flexShrink: 0 }}>
              <Avatar initials={cInitials} imgUrl={comment.avatarUrl} size={depth > 0 ? 32 : 40} />
            </Link>
          </ProfileHoverPreview>
        ) : <Avatar initials={cInitials} imgUrl={comment.avatarUrl} size={depth > 0 ? 32 : 40} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {comment.authorId ? <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || comment.authorId) : comment.authorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}><Link href={comment.authorType === "page" ? `/feed?view=company&pageId=${encodeURIComponent(comment.companyPageId || comment.authorId)}` : `/feed?view=profile&userId=${encodeURIComponent(comment.authorId)}`} style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT, textDecoration: "none" }}>{comment.author}</Link></ProfileHoverPreview> : <span style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT }}>{comment.author}</span>}
            {isPostAuthorComment && <span title="Auteur de la publication" style={{ color: LINKEDIN_BLUE, background: "#E8F3FF", border: "1px solid #B9D9F5", borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>Auteur</span>}
            {comment.isPlatformAdmin && <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />}
            {!comment.isPlatformAdmin && comment.isPremium && <PremiumBadge size={13} />}
            {comment.connectionBadge && (
              <span style={{ fontSize: 12, color: LI_SECONDARY }}>&middot; {comment.connectionBadge}</span>
            )}
            <span style={{ fontSize: 12, color: LI_SECONDARY, marginLeft: "auto", flexShrink: 0 }}>
              <RelativeTime date={comment.time} />
            </span>
          </div>
          {/* Headline */}
          {comment.headline && (
            <div style={{ fontSize: 12, color: LI_SECONDARY, marginTop: 1, lineHeight: 1.4 }}>{comment.headline}</div>
          )}
          {/* Body */}
          {isEditing ? (
            <div style={{ marginTop: 6 }}>
              <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} style={{ width: "100%", padding: 8, border: `1px solid ${LI_INPUT_BORDER}`, borderRadius: 8, resize: "vertical", font: "inherit" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="button" onClick={async () => { if (editText.trim()) { await onEditComment?.(comment.id, editText.trim()); setDisplayText(editText.trim()); setIsEditing(false); } }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: C.navy800, color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Enregistrer</button>
                <button type="button" onClick={() => { setEditText(comment.text || ""); setIsEditing(false); }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: C.navy50, color: LI_SECONDARY, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: LI_TEXT, lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{displayText}</div>
          )}
          {Array.isArray(comment.media) && comment.media.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {comment.media.map((item, index) => item?.url ? (
                item.type === "video"
                  ? <video key={index} src={item.url} controls style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  : <img key={index} src={item.url} alt={item.label || "Média du commentaire"} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
              ) : null)}
            </div>
          )}
          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            {/* Reaction button with picker */}
            <div
              style={{ position: "relative" }}
              ref={reactionBtnRef}
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={scheduleReactionClose}
              onTouchStart={handleCommentTouchStart}
              onTouchEnd={handleCommentTouchEnd}
              onTouchCancel={handleCommentTouchEnd}
            >
              <button
                onClick={() => handleReactionSelect("ok")}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: localReaction ? C.gold600 : LI_SECONDARY, padding: "4px 0" }}
              >
                {localReaction ? <ReactionIcon reaction={localReaction} selected size={13} /> : <ThumbsUp size={13} />}
                J'aime
              </button>
              {showReactionPicker && (
                <div onMouseEnter={keepReactionPickerOpen} onMouseLeave={scheduleReactionClose} style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 20 }}>
                  <ReactionPicker
                    selectedKey={localReaction}
                    onSelect={handleReactionSelect}
                  />
                </div>
              )}
            </div>
            {/* Total reactions count */}
            {(comment.totalReactions || 0) > 0 && (
              <span style={{ fontSize: 12, color: LI_SECONDARY, display: "inline-flex", alignItems: "center", gap: 2 }}>
                {comment.reactionKeys?.map((key) => reactionByKey(key)).filter(Boolean).map((item) => <ReactionIcon key={item.key} reaction={item} size={11} />)}
                <span>&middot; {comment.totalReactions}</span>
              </span>
            )}
            <button onClick={() => { setReplying(false); onStartReply?.(comment); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: LI_SECONDARY, padding: "4px 0 4px 8px" }}>Répondre</button>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button type="button" onClick={() => setShowMenu((value) => !value)} aria-label="Options du commentaire" aria-expanded={showMenu} style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 4 }}><MoreHorizontal size={15} /></button>
              {showMenu && (
                <div className="post-viewer-comment-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onReportComment?.(comment.id); }}><Flag size={14} /> Signaler</button>
                  <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onHideComment?.(comment.id); }}><EyeOff size={14} /> Masquer</button>
                  {(comment.isOwn || String(commentAuthorId) === String(currentUser?.id)) && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setIsEditing(true); }}><Pencil size={14} /> Modifier</button>}
                  {(comment.isOwn || String(commentAuthorId) === String(currentUser?.id)) && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onDeleteComment?.(comment.id); }} className="post-viewer-comment-menu-danger"><Trash2 size={14} /> Supprimer</button>}
                </div>
              )}
            </div>
          </div>
          {/* Reply input */}
          {replying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply()} placeholder="\u00c9crire une r\u00e9ponse..." style={{ flex: 1, padding: "8px 14px", borderRadius: 20, border: `1px solid ${LI_INPUT_BORDER}`, outline: "none", fontSize: 13 }} />
              <button onClick={submitReply} disabled={!replyText.trim()} style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: replyText.trim() ? LINKEDIN_BLUE : LI_BORDER, color: replyText.trim() ? C.white : LI_SECONDARY, fontWeight: 600, fontSize: 12.5, cursor: replyText.trim() ? "pointer" : "default" }}>Envoyer</button>
            </div>
          )}
        </div>
      </div>
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <button
          type="button"
          onClick={() => setShowReplies((value) => !value)}
          aria-expanded={showReplies}
          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, marginLeft: 50, padding: "4px 0", background: "none", border: "none", color: LI_SECONDARY, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showReplies ? "Masquer les réponses" : `Afficher les ${comment.replies.length} réponse${comment.replies.length > 1 ? "s" : ""}`}
        </button>
      )}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 8, marginLeft: 50, display: "flex", flexDirection: "column" }}>
          {comment.replies.map((r) => <CommentItem key={r.id} comment={r} currentUser={currentUser} onToggleLike={onToggleLike} onReply={onReply} onStartReply={onStartReply} onToggleCommentReaction={onToggleCommentReaction} onReportComment={onReportComment} onHideComment={onHideComment} onEditComment={onEditComment} onDeleteComment={onDeleteComment} postId={postId} postAuthorId={postAuthorId} depth={depth + 1} />)}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                    */
/* ------------------------------------------------------------------ */
export default function PostViewerPreview({
  post,
  currentUser,
  onClose,
  onToggleLike,
  onReact,
  onToggleBookmark,
  onAddComment,
  onReplyComment,
  onToggleCommentLike,
  onToggleCommentReaction,
  onShare,
  onFollowPage,
  followedPageIds = [],
  isCompanyAccount = false,
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [showAllComments, setShowAllComments] = useState(false);
  const [hiddenCommentIds, setHiddenCommentIds] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(!Array.isArray(post?.comments));
  const commentsPanelRef = useRef(null);
  const commentInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFilePostContent = isFilePost(post);
  const isSponsoredPost = Boolean(post?.isSponsored || post?.campaignId);
  const isJobPost = post?.variant === "job";
  const jobId = post?.jobId || post?.id;
  const [jobEngagement, setJobEngagement] = useState(null);
  const engagementRequestRef = useRef(0);

  useEffect(() => {
    if (!isJobPost || !post?.companyPageId || !jobId) return;
    const refreshEngagement = () => {
      const requestId = ++engagementRequestRef.current;
      return fetchBackendApi(`/api/company/jobs/engagement?ownerId=${encodeURIComponent(post.companyPageId)}&jobId=${encodeURIComponent(jobId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data && requestId === engagementRequestRef.current) setJobEngagement(data); })
      .catch(() => {});
    };
    refreshEngagement();
    const interval = window.setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive
      refreshEngagement();
    }, 10000); // Increased from 1s to 10s
    return () => window.clearInterval(interval);
  }, [isJobPost, post?.companyPageId, jobId]);

  useEffect(() => {
    setShowAllComments(false);
  }, [post?.id]);

  useEffect(() => {
    setCommentsLoading(!Array.isArray(post?.comments));
  }, [post?.id, post?.comments]);

  const viewerPost = isJobPost && jobEngagement ? { ...post, ...jobEngagement } : post;
  const media = normalizeMedia(viewerPost?.media);
  const comments = Array.isArray(viewerPost?.comments)
    ? (isJobPost ? decorateJobComments(viewerPost.comments, currentUser?.id) : viewerPost.comments)
    : [];
  const visibleCommentSource = filterHiddenComments(comments, hiddenCommentIds);
  const reaction = isJobPost
    ? Object.entries(jobEngagement?.reactions || {}).find(([, ids]) => ids.includes(currentUser?.id))?.[0] || null
    : post?.reaction || (post?.liked ? "ok" : null);
  const commentsCount = countComments(visibleCommentSource);
  const repostCount = getRepostCount(post);
  const reactionCount = getReactionCount(viewerPost);
  const engagementReactions = getEngagementReactions(viewerPost, reaction);
  const isOwn = currentUser?.id === post?.authorId || currentUser?.id === post?.userId;
  const isPagePost = Boolean(post?.authorType === "page" || post?.companyPageId || post?.pageId);
  const isAnnouncement = Boolean(post?.presentation?.type === "announcement" || post?.presentation === "announcement" || (typeof post?.presentation === "string" && post.presentation.includes('"type":"announcement"')));
  const isOfficialPost = Boolean(post?.isPlatformAdmin || isAnnouncement);
  const announcementAuthor = isAnnouncement ? "LynoraLink" : (post?.author || "Utilisateur");
  const announcementAvatar = isAnnouncement ? (post?.presentation?.avatarUrl || "/logo_lynora.svg") : (post?.avatarUrl || null);
  const group = post?.group || null;
  const groupCoverUrl = group?.coverUrl || group?.cover || group?.bannerUrl || group?.backgroundImage || null;
  const isOwnPage = isCompanyAccount && isPagePost && String(post.companyPageId) === String(currentUser?.id);
  const pageProfileId = post?.companyPageId || post?.pageId || post?.authorId;
  const isPageFollowed = isPagePost && followedPageIds.some((id) => String(id) === String(pageProfileId));

  const addComment = async (text, media = []) => {
    const result = await onAddComment?.(post.id, text, media.length ? media : undefined);
    if (isJobPost && result) setJobEngagement(result);
    setCommentText("");
  };

  const uploadMediaFile = (file) => new Promise((resolve) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = file.type.startsWith("video") ? process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET : process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const resourceType = file.type.startsWith("video") ? "video" : "image";
    if (!cloudName || !preset) { resolve(null); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("resource_type", resourceType);
    formData.append("folder", "lynoralink");
    fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: formData })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.secure_url ? { url: data.secure_url, type: resourceType, label: file.name } : null;
      })
      .then(resolve)
      .catch(() => resolve(null));
  });

  const handleMediaSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingMedia(true);
    try {
      const uploaded = (await Promise.all(files.map(uploadMediaFile))).filter(Boolean);
      setAttachedMedia((current) => [...current, ...uploaded]);
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const handleCommentSubmit = async () => {
    if ((!commentText.trim() && !attachedMedia.length) || uploadingMedia) return;
    if (replyingTo) {
      await handleCommentReply(post.id, replyingTo.id, commentText.trim(), attachedMedia.length ? attachedMedia : undefined);
    } else {
      await addComment(commentText.trim(), attachedMedia);
    }
    setCommentText("");
    setAttachedMedia([]);
    setReplyingTo(null);
    setShowEmoji(false);
  };

  const handleSendPost = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    const shareData = {
      title: post?.headline || `Publication de ${post?.author || "LynoraLink"}`,
      text: post?.text || post?.excerpt || "Découvrez cette publication sur LynoraLink.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard?.writeText(url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        await navigator.clipboard?.writeText(url).catch(() => {});
      }
    }
  };

  const sortedComments = [...visibleCommentSource].sort((first, second) => {
    if (sortBy === "relevant") return (second.likes || 0) - (first.likes || 0);
    return new Date(second.time || second.createdAt || 0).getTime() - new Date(first.time || first.createdAt || 0).getTime();
  });
  const visibleComments = showAllComments ? sortedComments : sortedComments.slice(0, 3);
  const visibleCommentsCount = visibleComments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);
  const hiddenCount = Math.max(0, commentsCount - visibleCommentsCount);

  const visibility = post?.visibility || post?.audience || "public";
  const followers = post?.followers || post?.subscribers || post?.connections;
  const jobTitle = post?.title || post?.jobTitle || "Opportunité professionnelle";
  const jobType = post?.jobType || "Offre d'emploi";
  const jobDescription = post?.description || post?.text || post?.excerpt || "";
  const handleViewerLike = async () => {
    if (!isJobPost) return onToggleLike?.(post.id);
    const response = await fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "reaction", reaction: reaction || "ok" }) });
    if (response.ok) setJobEngagement(await response.json());
  };
  const handleViewerReaction = async (reactionKey) => {
    if (!isJobPost) return onReact?.(post.id, reactionKey);
    const response = await fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "reaction", reaction: reactionKey }) });
    if (response.ok) setJobEngagement(await response.json());
  };
  const handleCommentReaction = async (postId, commentId, reactionKey) => {
    if (!isJobPost) return onToggleCommentReaction?.(postId, commentId, reactionKey);
    ++engagementRequestRef.current;
    const response = await fetchBackendApi("/api/company/jobs/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "commentReaction", commentId, reaction: reactionKey }),
    });
    if (!response.ok) throw new Error("Impossible de réagir au commentaire");
    const result = await response.json();
    setJobEngagement((current) => ({ ...current, comments: result.comments || current?.comments || [] }));
  };
  const handleCommentReply = async (postId, parentCommentId, text, media = []) => {
    if (!isJobPost) return onReplyComment?.(postId, parentCommentId, text, media);
    ++engagementRequestRef.current;
    const response = await fetchBackendApi("/api/company/jobs/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: post.companyPageId, jobId, action: "commentReply", parentCommentId, text, media }),
    });
    if (!response.ok) throw new Error("Impossible de répondre au commentaire");
    const result = await response.json();
    setJobEngagement((current) => ({ ...current, comments: result.comments || current?.comments || [] }));
  };
  const handleHideComment = (commentId) => {
    setHiddenCommentIds((current) => [...new Set([...current, String(commentId)])]);
  };
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    const response = await fetchBackendApi(`/api/posts/${post.id}/comments/${commentId}`, { method: "DELETE" });
    if (response.ok) handleHideComment(commentId);
  };
  const handleEditComment = async (commentId, text) => {
    const response = await fetchBackendApi(`/api/posts/${post.id}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Impossible de modifier le commentaire");
  };
  const handleReportComment = async (commentId) => {
    const reason = window.prompt("Pourquoi signalez-vous ce commentaire ?", "Contenu inapproprié");
    if (!reason) return;
    await fetchBackendApi("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "comment", targetId: String(commentId), targetLabel: `Commentaire ${commentId}`, reason, details: "Signalement depuis le viewer de publication" }),
    });
  };

  return (
    <div className="post-viewer-overlay" style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(8, 28, 48, 0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <style>{`
        .post-viewer-modal {
          width: min(1120px, 100%);
          height: min(88vh, 820px);
          min-height: 0;
          box-sizing: border-box;
          overflow: hidden;
        }
        .post-viewer-left {
          flex: 0 0 58%;
          height: 100%;
          max-height: 100%;
          min-height: 0;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #7890a5 #edf3f8;
          scrollbar-gutter: stable;
        }
        .post-viewer-left::-webkit-scrollbar,
        .post-viewer-modal::-webkit-scrollbar {
          width: 10px;
        }
        .post-viewer-left::-webkit-scrollbar-thumb,
        .post-viewer-modal::-webkit-scrollbar-thumb {
          background: #7890a5;
          border: 2px solid #edf3f8;
          border-radius: 10px;
        }
        .post-viewer-left::-webkit-scrollbar-track,
        .post-viewer-modal::-webkit-scrollbar-track {
          background: #edf3f8;
        }
        .post-viewer-right { flex: 1 1 42%; min-height: 0; }
        .post-viewer-comment-menu {
          position: absolute;
          right: calc(100% + 8px);
          bottom: auto;
          top: 0;
          z-index: 30;
          min-width: 180px;
          overflow: hidden;
          background: ${C.white};
          border: 1px solid ${LI_BORDER};
          border-radius: 12px;
          box-shadow: 0 10px 28px rgba(15,51,82,0.14);
        }
        .post-viewer-comment-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: ${LI_TEXT};
          text-align: left;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .post-viewer-comment-menu button:hover { background: ${C.navy50}; }
        .post-viewer-comment-menu button.post-viewer-comment-menu-danger { background: #FBEDED; color: ${C.danger}; }
        .post-viewer-comment-menu button.post-viewer-comment-menu-danger:hover { background: #F6E2E2; }
        .post-viewer-modal,
        .post-viewer-left,
        .post-viewer-right,
        .post-viewer-author-header,
        .post-viewer-media,
        .post-viewer-job-description {
          border-radius: 0 !important;
        }
        .reaction-picker {
          border-radius: 999px !important;
        }
        .post-viewer-job-description {
          height: auto;
          max-height: none;
          overflow: visible;
          overflow-x: hidden;
        }
        .post-viewer-job-card {
          max-height: min(560px, calc(100dvh - 250px));
          overflow-y: auto !important;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #7890a5 #edf3f8;
          scrollbar-gutter: stable;
        }
        .post-viewer-job-card::-webkit-scrollbar { width: 10px; }
        .post-viewer-job-card::-webkit-scrollbar-thumb { background: #7890a5; border: 2px solid #edf3f8; border-radius: 10px; }
        .post-viewer-job-card::-webkit-scrollbar-track { background: #edf3f8; }
        .post-viewer-media { min-height: 360px !important; }
        .post-viewer-sponsored-card { overflow: visible !important; }
        .post-viewer-sponsored-card .post-viewer-media {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
        }
        /* Facebook-style sponsored ad in PostViewer (navy/gold) */
        .pv-sponsored-block {
          border: 1px solid rgba(217,165,54,0.45);
          border-radius: 12px;
          overflow: hidden;
          background: #FFFDF7;
          box-shadow: 0 4px 14px rgba(217,165,54,0.10);
          transition: box-shadow 220ms ease, border-color 220ms ease;
        }
        .pv-sponsored-block:hover {
          border-color: rgba(217,165,54,0.7);
          box-shadow: 0 6px 20px rgba(217,165,54,0.16);
        }
        .pv-sponsored-header span:first-child { transition: color 160ms ease; }
        .pv-sponsored-toggle:hover { text-decoration: underline !important; }
        .pv-sponsored-cta:hover { filter: brightness(0.95); transform: translateY(-1px); }
        .pv-sponsored-cta:active { transform: translateY(0); filter: brightness(0.9); }
        .pv-sponsored-wa:hover { background: #F0F6F2; border-color: #127A3D; }
        @media (prefers-reduced-motion: reduce) {
          .pv-sponsored-block, .pv-sponsored-cta, .pv-sponsored-wa {
            transition: none !important;
          }
          .pv-sponsored-cta:hover { transform: none; }
        }
        .post-viewer-slider-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: rgba(8, 28, 48, 0.68);
          box-shadow: 0 3px 12px rgba(0,0,0,0.24);
          cursor: pointer;
          z-index: 3;
        }
        .post-viewer-slider-button:hover { background: rgba(8, 28, 48, 0.88); }
        .post-viewer-slider-previous { left: 12px; }
        .post-viewer-slider-next { right: 12px; }
        @media (max-width: 900px) {
          .post-viewer-action-btn {
            flex: 1 1 0 !important;
            width: auto !important;
            min-width: 0 !important;
            gap: 0 !important;
            min-height: 42px;
          }
          .post-viewer-action-btn > span { display: none !important; }
          .post-viewer-modal {
            width: 100vw !important;
            max-width: none !important;
            min-width: 100vw !important;
            margin-left: calc(50% - 50vw) !important;
            border-radius: 0 !important;
          }
          .post-viewer-left,
          .post-viewer-right,
          .post-viewer-author-header,
          .post-viewer-media,
          .post-viewer-job-description {
            border-radius: 0 !important;
          }
          .reaction-picker {
            border-radius: 999px !important;
          }
        }
        .post-viewer-author-header { position: sticky; top: 0; z-index: 12; background: var(--app-surface); backdrop-filter: blur(10px); border-bottom: 1px solid ${LI_BORDER}; }
        @media (max-width: 900px) {
          .post-viewer-overlay {
            width: 100vw !important;
            max-width: none !important;
            margin-left: calc(50% - 50vw) !important;
            padding: 0 !important;
            align-items: stretch !important;
            display: block !important;
            height: 100dvh !important;
            min-height: 0 !important;
            overflow: hidden !important;
            overflow-x: hidden !important;
            overscroll-behavior: none;
            touch-action: pan-y;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          .post-viewer-modal {
            width: 100vw !important;
            max-width: none !important;
            min-width: 100vw !important;
            height: 100dvh !important;
            min-height: 0 !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            flex-direction: column !important;
            display: flex !important;
            overflow: hidden !important;
            overflow-x: hidden !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 0 !important;
            box-sizing: border-box !important;
          }
          .post-viewer-left {
            flex: 0 0 54dvh !important;
            width: 100% !important;
            height: 54dvh !important;
            min-height: 0 !important;
            max-height: 54dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior: auto !important;
            border-bottom: 1px solid ${LI_BORDER};
          }
          .post-viewer-right {
            flex: 1 1 46dvh !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 300px !important;
            height: 46dvh !important;
            max-height: 46dvh !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            background: ${C.white} !important;
          }
          .post-viewer-author-header {
            padding: 14px 16px 10px !important;
          }
          .post-viewer-left > div:first-child { padding: 14px 16px 0 !important; }
          .post-viewer-left > div:nth-child(2) { padding: 12px 16px !important; }
          .post-viewer-left > div:nth-child(3) { padding: 0 16px !important; }
          .post-viewer-left > div:nth-child(4) { padding: 10px 16px !important; }
          .post-viewer-left > div:nth-child(6) { padding: 0 8px !important; }
          .post-viewer-media { min-height: 0 !important; max-height: none !important; height: auto !important; overflow: visible !important; }
          .post-viewer-media img, .post-viewer-media video { width: auto !important; max-width: 100% !important; max-height: 52dvh !important; height: auto !important; }
          .post-viewer-job-description {
            height: auto;
            max-height: none;
            overflow: visible;
            overflow-x: hidden;
          }
          .post-viewer-job-card {
            max-height: min(520px, 58dvh);
          }
          .post-viewer-slider-button { width: 34px; height: 34px; }
          .post-viewer-slider-previous { left: 8px; }
          .post-viewer-slider-next { right: 8px; }
          .post-viewer-right > div:first-child { padding: 12px 16px !important; }
          .post-viewer-right > div:nth-child(2) {
            width: 100% !important;
            min-width: 0 !important;
            padding: 0 16px !important;
            flex: 1 1 auto !important;
            height: auto !important;
            max-height: none !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-bottom: 72px !important;
            background: ${C.white} !important;
          }
          .post-viewer-right > div:last-child {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 15 !important;
            margin: 0 !important;
            padding: 10px 12px !important;
            padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
            min-height: 72px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            box-shadow: 0 -4px 12px rgba(15,51,82,0.08);
          }
          .post-viewer-close {
            top: 10px !important;
            right: 10px !important;
            background: var(--app-input) !important;
            color: var(--app-text) !important;
            box-shadow: 0 3px 12px rgba(0,0,0,0.12);
          }
          .post-share-overlay { padding: 0 !important; align-items: stretch !important; }
          .post-share-modal { width: 100% !important; max-width: none !important; max-height: 100dvh !important; height: 100dvh !important; border-radius: 0 !important; padding-bottom: env(safe-area-inset-bottom); }
          .post-share-modal input, .post-share-modal textarea { font-size: 16px !important; }
        }
        @media (max-width: 420px) {
          .post-viewer-author-header {
            gap: 8px !important;
          }
          .post-viewer-author-header > div:first-child {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
          }
          .post-viewer-author-header > div:nth-child(2) {
            font-size: 13px !important;
          }
          .post-viewer-comment-input {
            font-size: 14px !important;
            padding-right: 110px !important;
          }
        }
      `}</style>
      {/* ===== MODAL CONTAINER ===== */}
      <div
        className="post-viewer-modal"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 1120,
          height: "min(88vh, 820px)",
          maxHeight: "calc(100dvh - 48px)",
          background: C.white,
          borderRadius: isAnnouncement ? 16 : 0,
          border: isAnnouncement ? "1px solid rgba(217,165,54,0.55)" : "none",
          overflow: "hidden",
          boxShadow: isAnnouncement ? "0 8px 24px rgba(15,51,82,0.12), 0 0 0 1px rgba(217,165,54,0.08)" : "0 4px 24px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "row",
          position: "relative",
        }}
      >
        {/* ===== CLOSE BUTTON ===== */}
        <button
          className="post-viewer-close"
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 50,
            width: 36, height: 36, border: "none", borderRadius: "50%",
            background: "transparent", color: LI_SECONDARY, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = LI_HOVER)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <X size={20} />
        </button>

        {/* ============================================================ */}
        {/*  LEFT PANEL — POST CONTENT                                   */}
        {/* ============================================================ */}
        <div className="post-viewer-left" style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", overflowY: "auto", minHeight: 0, minWidth: 0, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {isAnnouncement && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "linear-gradient(100deg, #0F3352 0%, #1B5386 72%, #D9A536 100%)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.045em", textTransform: "uppercase", flexShrink: 0 }}>
              <Megaphone size={15} color="#F6D374" />
              <span>Annonce officielle LynoraLink</span>
            </div>
          )}
          {/* --- Header --- */}
          <div className="post-viewer-author-header" style={{ padding: "20px 24px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            {group ? (
              <div style={{ position: "relative", width: 54, height: 46, flexShrink: 0 }}>
                <ProfileHoverPreview type="group" entity={group}>
                  <Link href={`/feed?view=groups&groupId=${encodeURIComponent(group.id)}`} aria-label={`Voir le groupe ${group.name}`} style={{ display: "inline-flex" }}>
                    <div
                    className="pc-group-cover"
                    aria-label={`Couverture de ${group.name}`}
                    style={{
                      position: "absolute", left: 0, top: 0, width: 42, height: 42, borderRadius: 8,
                      background: group.coverGradient || navyGrad,
                      backgroundImage: groupCoverUrl ? `url(${groupCoverUrl})` : undefined,
                      backgroundSize: "cover", backgroundPosition: "center", border: `2px solid ${C.white}`,
                      boxShadow: "0 1px 4px rgba(15,51,82,0.16)",
                      cursor: "pointer",
                    }}
                    />
                  </Link>
                </ProfileHoverPreview>
                <div style={{ position: "absolute", right: 0, bottom: 0 }}>
                  <ProfileHoverPreview type={isPagePost ? "page" : "person"} fallback={{ id: isPagePost ? post?.companyPageId : post?.authorId, name: post?.author || "Utilisateur", avatarUrl: post?.avatarUrl, coverUrl: post?.pageCoverUrl || post?.coverUrl, bio: post?.description, location: post?.location, followersCount: post?.followersCount }}>
                    <Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(post?.companyPageId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post?.authorId || "")}`} aria-label={`Voir ${isPagePost ? "la page" : "le profil"} de ${post?.author || "Utilisateur"}`} style={{ display: "inline-flex" }}>
                      <Avatar initials={post?.initials || "U"} imgUrl={post?.avatarUrl} size={28} />
                    </Link>
                  </ProfileHoverPreview>
                </div>
              </div>
            ) : post?.authorId ? (
              <ProfileHoverPreview type={isPagePost ? "page" : "person"} fallback={{ id: isPagePost ? post?.companyPageId : post?.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, coverUrl: post?.pageCoverUrl || post?.coverUrl, bio: post?.description, location: post?.location, followersCount: post?.followersCount }}>
                <Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(post?.companyPageId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} aria-label={`Voir ${isPagePost ? "la page" : "le profil"} de ${announcementAuthor}`} style={{ display: "inline-flex", flexShrink: 0 }}>
                  <Avatar initials={isAnnouncement ? "LL" : (post?.initials || "U")} imgUrl={announcementAvatar} size={48} />
                </Link>
              </ProfileHoverPreview>
            ) : <Avatar initials={isAnnouncement ? "LL" : (post?.initials || "U")} imgUrl={announcementAvatar} size={48} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {group ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 700, color: LI_TEXT }}>
                      <ProfileHoverPreview type="group" entity={group}>
                        <Link href={`/feed?view=groups&groupId=${encodeURIComponent(group.id)}`} style={{ overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}>{group.name}</Link>
                      </ProfileHoverPreview>
                    </div>
                    {isPagePost && !isOwnPage && (
                      <button
                        type="button"
                        onClick={() => onFollowPage?.(post.companyPageId)}
                        disabled={isPageFollowed || !onFollowPage}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 8, border: "1px solid #D9A536", background: isPageFollowed ? "#FFF8E5" : "linear-gradient(135deg, #F6D374, #D9A536)", color: "#0F3352", fontSize: 11, fontWeight: 800, cursor: isPageFollowed || !onFollowPage ? "default" : "pointer", boxShadow: isPageFollowed ? "none" : "0 2px 6px rgba(217,165,54,0.24)" }}
                      >
                        {isPageFollowed ? <><Check size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: LI_SECONDARY, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {post?.authorId ? (
                      <Link href={`/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} style={{ color: LI_TEXT, fontWeight: 600, textDecoration: "none" }}>{post?.author || "Utilisateur"}</Link>
                    ) : <span style={{ color: LI_TEXT, fontWeight: 600 }}>{post?.author || "Utilisateur"}</span>}
                    {post?.isPlatformAdmin && <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />}
                    {!post?.isPlatformAdmin && post?.isPremium && <PremiumBadge size={13} />}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 700, color: LI_TEXT }}>
                      {post?.authorId && !isAnnouncement ? <ProfileHoverPreview type={isPagePost ? "page" : "person"} fallback={{ id: isPagePost ? post?.companyPageId : post?.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, coverUrl: post?.pageCoverUrl || post?.coverUrl, bio: post?.description, location: post?.location, followersCount: post?.followersCount }}><Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(post?.companyPageId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} style={{ overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}>{announcementAuthor}</Link></ProfileHoverPreview> : <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{announcementAuthor}</span>}
                      {isOfficialPost && <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" />}
                      {!isOfficialPost && post?.isPremium && <PremiumBadge size={14} />}
                    </div>
                    {isPagePost && !isOwnPage && (
                      <button
                        type="button"
                        onClick={() => onFollowPage?.(post.companyPageId)}
                        disabled={isPageFollowed || !onFollowPage}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 8, border: "1px solid #D9A536", background: isPageFollowed ? "#FFF8E5" : "linear-gradient(135deg, #F6D374, #D9A536)", color: "#0F3352", fontSize: 11, fontWeight: 800, cursor: isPageFollowed || !onFollowPage ? "default" : "pointer", boxShadow: isPageFollowed ? "none" : "0 2px 6px rgba(217,165,54,0.24)" }}
                      >
                        {isPageFollowed ? <><Check size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}
                      </button>
                    )}
                  </div>
                  {followers != null && (
                    <div style={{ fontSize: 14, color: LI_SECONDARY, marginTop: 1 }}>{typeof followers === "number" ? `${formatCount(followers)} abonn\u00e9s` : followers}</div>
                  )}
                </>
              )}
              <div style={{ fontSize: 13, color: LI_SECONDARY, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <span>{post?.time ? <RelativeTime date={post.time} /> : "maintenant"}</span>
                <span>&middot;</span>
                <VisibilityIcon visibility={visibility} />
              </div>
              <PostContextMeta post={post} currentUserId={currentUser?.id} />
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                style={{ width: 36, height: 36, border: "none", borderRadius: "50%", background: "transparent", color: LI_SECONDARY, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = LI_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <MoreHorizontal size={22} />
              </button>
              {moreMenuOpen && <MoreMenu isOwn={isOwn} onEdit={() => { setMoreMenuOpen(false); }} onDelete={() => { setMoreMenuOpen(false); }} onReport={() => { setMoreMenuOpen(false); }} onCopyLink={() => { navigator.clipboard?.writeText(`${window.location.origin}/feed?post=${post.id}`); setMoreMenuOpen(false); }} onClose={() => setMoreMenuOpen(false)} />}
            </div>
          </div>

          {/* --- Post Text / Job Offer --- */}
          {isFilePostContent ? (
            <>
              <div style={{ padding: "16px 24px 4px" }}>
                <PostText text={post?.text || post?.fileDescription || post?.file?.description || post?.attachment?.description} />
              </div>
              <FileViewerBanner post={post} />
            </>
          ) : isJobPost ? (
            <div className="post-viewer-job-card" style={{ margin: "8px 24px 20px", border: `1px solid ${LI_BORDER}`, borderRadius: 0, overflow: "hidden", background: C.white, boxShadow: "0 5px 16px rgba(15,51,82,0.06)" }}>
              <div style={{ padding: "18px 20px 20px", background: "linear-gradient(135deg, #0F3352 0%, #1B5386 100%)", color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid rgba(246,211,116,.35)", borderRadius: 999, background: "rgba(246,211,116,.12)", color: "#F6D374", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>
                    <Briefcase size={14} /> {jobType}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.68)", fontWeight: 600 }}>Opportunité professionnelle</span>
                </div>
                <h1 style={{ margin: "14px 0 0", fontSize: 24, lineHeight: 1.2, fontWeight: 800, letterSpacing: "0.01em" }}>{jobTitle}</h1>
              </div>
              {(post?.contract || post?.loc) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "14px 20px", borderBottom: `1px solid ${LI_BORDER}`, background: "var(--app-bg)", color: LI_SECONDARY, fontSize: 12.5, fontWeight: 600 }}>
                  {post.contract && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 7, background: C.white, border: `1px solid ${LI_BORDER}` }}><Briefcase size={14} color={C.navy800} /> {post.contract}</span>}
                  {post.loc && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 7, background: C.white, border: `1px solid ${LI_BORDER}` }}><MapPin size={14} color={C.navy800} /> {post.loc}</span>}
                </div>
              )}
              <div style={{ padding: "18px 20px 10px" }}>
                <div style={{ color: LI_TEXT, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Description du poste</div>
              </div>
              <div className="post-viewer-job-description" style={{ padding: "0 20px 20px" }}>
                <PostText text={jobDescription} />
              </div>
            </div>
          ) : isSponsoredPost ? (
            <SponsoredViewerCard post={post} />
          ) : (
            <div style={{ padding: "16px 24px" }}>
              <PostText text={post?.headline || post?.text || post?.excerpt} />
            </div>
          )}

          {/* --- Media --- */}
          {!isSponsoredPost && media.length > 0 && (
            <div style={{ padding: "0 24px" }}>
              <MediaGallery items={media} />
            </div>
          )}

          {/* --- Engagement Stats Bar --- */}
          <div style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Left: reaction mini-avatars + count */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Mini reaction circles */}
              <div style={{ display: "flex" }}>
                {engagementReactions.map((r, i) => (
                  <div
                    key={r.key}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${C.white}`,
                      marginLeft: i > 0 ? -6 : 0,
                      background: r.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: engagementReactions.length - i,
                      overflow: "hidden",
                    }}
                  >
                    <img src={r.src} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                  </div>
                ))}
              </div>
              {reactionCount > 0 && (
                <span style={{ fontSize: 13, color: LI_SECONDARY, marginLeft: 4 }}>
                  {reaction ? "Vous et" : ""} {reactionCount > 1 ? `${reactionCount} autres` : reactionCount}
                </span>
              )}
            </div>
            {/* Right: comments + reposts */}
            <div style={{ fontSize: 13, color: LI_SECONDARY, display: "flex", gap: 6 }}>
              {commentsCount > 0 && <span>{commentsCount} commentaire{commentsCount > 1 ? "s" : ""}</span>}
              {repostCount > 0 && <span>&middot; {repostCount} replications</span>}
            </div>
          </div>

          {/* --- Separator --- */}
          <div style={{ height: 1, background: LI_DIVIDER, margin: "0 24px" }} />

          {/* --- Action Buttons --- */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2, padding: "0 8px", alignItems: "stretch" }}>
            <ReactionButton reaction={reaction} onReact={handleViewerReaction} onToggleLike={handleViewerLike} />
            <LIActionBtn icon={MessageCircle} label="Commenter" onClick={() => commentInputRef.current?.focus()} />
            <LIActionBtn icon={Share2} label="Partager" onClick={() => setShareOpen(true)} />
            <LIActionBtn icon={Bookmark} label="Enregistrer" active={post?.bookmarked} onClick={() => onToggleBookmark?.(post.id)} />
          </div>

          {/* --- Bottom spacer --- */}
          <div style={{ flex: 1, minHeight: 24 }} />
        </div>

        {/* ===== Vertical Divider ===== */}
        <div style={{ width: 1, background: LI_DIVIDER, flexShrink: 0 }} />

        {/* ============================================================ */}
        {/*  RIGHT PANEL — COMMENTS                                      */}
        {/* ============================================================ */}
        <div ref={commentsPanelRef} className="post-viewer-right" style={{ flex: "1 1 42%", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, background: C.white }}>
          {/* --- Comments Header --- */}
          {/* padding-right agrandi pour laisser respirer le bouton close (absolute, top:14/right:14, 36px) qui survole ce panneau */}
          <div style={{ padding: "16px 56px 16px 20px", borderBottom: `1px solid ${LI_BORDER}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: LI_TEXT, whiteSpace: "nowrap" }}>Commentaires ({commentsCount})</span>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: sortOpen ? C.navy50 : C.white,
                  border: `1px solid ${sortOpen ? C.navy700 : LI_INPUT_BORDER}`,
                  borderRadius: 20,
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: LI_TEXT,
                  padding: "6px 10px 6px 12px",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!sortOpen) e.currentTarget.style.background = LI_HOVER; }}
                onMouseLeave={(e) => { if (!sortOpen) e.currentTarget.style.background = C.white; }}
              >
                <ListFilter size={13} color={C.navy700} style={{ flexShrink: 0 }} />
                <span style={{ color: LI_SECONDARY, whiteSpace: "nowrap" }}>Trier :</span>
                <span style={{ fontWeight: 600, color: LI_TEXT, whiteSpace: "nowrap" }}>{sortBy === "recent" ? "R\u00e9cents" : "Pertinents"}</span>
                <ChevronDown size={13} color={LI_SECONDARY} style={{ transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }} />
              </button>
              {sortOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, background: C.white, borderRadius: 12, border: `1px solid ${LI_BORDER}`, boxShadow: "0 12px 28px rgba(15,51,82,0.18)", zIndex: 20, padding: 6 }}>
                  {[{ key: "recent", label: "Les plus r\u00e9cents" }, { key: "relevant", label: "Les plus pertinents" }].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        padding: "9px 10px", background: sortBy === opt.key ? C.navy50 : "transparent",
                        border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        fontWeight: sortBy === opt.key ? 600 : 400, color: sortBy === opt.key ? C.navy900 : LI_TEXT,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => { if (sortBy !== opt.key) e.currentTarget.style.background = LI_HOVER; }}
                      onMouseLeave={(e) => { if (sortBy !== opt.key) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.key && <Check size={14} color={C.navy700} style={{ flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- Comments List (scrollable) --- */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
            {(commentsLoading || post?.loadingComments) && (
              <div style={{ width: "100%", padding: "16px 0 8px" }}>
                <CommentSkeleton count={4} />
              </div>
            )}
            {!commentsLoading && !post?.loadingComments && visibleComments.map((comment) => (
              <div key={comment.id} style={{ borderBottom: `1px solid ${LI_BORDER}` }}>
                <CommentItem
                  comment={comment}
                  currentUser={currentUser}
                  onToggleLike={onToggleCommentLike || (() => {})}
                  onToggleCommentReaction={handleCommentReaction}
                  onReportComment={handleReportComment}
                  onHideComment={handleHideComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  onReply={(commentId, text) => handleCommentReply(post.id, commentId, text)}
                  onStartReply={(comment) => { setReplyingTo(comment); commentInputRef.current?.focus(); }}
                  postId={post.id}
                  postAuthorId={post.authorId}
                />
              </div>
            ))}
            {!commentsLoading && !post?.loadingComments && (hiddenCount > 0 || showAllComments) && (
              <button onClick={() => setShowAllComments((visible) => !visible)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: LINKEDIN_BLUE, padding: "14px 0", width: "100%", textAlign: "left" }}>
                {showAllComments ? "Réduire les commentaires" : `Voir les ${hiddenCount} autres commentaires`}
                <ChevronDown size={16} style={{ transform: showAllComments ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
              </button>
            )}
            {!commentsLoading && !post?.loadingComments && hiddenCommentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setHiddenCommentIds([])}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: LINKEDIN_BLUE, padding: "8px 0 14px", width: "100%", textAlign: "left" }}
              >
                Réafficher les commentaires masqués
              </button>
            )}
            {!commentsLoading && !post?.loadingComments && comments.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: LI_SECONDARY, fontSize: 14 }}>
                Soyez le premier à commenter cette publication.
              </div>
            )}
          </div>

          {/* --- Comment Composer (sticky bottom) --- */}
          <div className="post-viewer-composer" style={{ padding: "12px 16px", borderTop: `1px solid ${LI_BORDER}`, background: C.white, boxSizing: "border-box", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10, width: "100%", maxWidth: "100%", minHeight: 72, overflow: "visible" }}>
            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <Avatar initials={currentUser?.initials || "VS"} imgUrl={currentUser?.avatarUrl} size={36} />
            </div>
            <div style={{ flex: "1 1 auto", minWidth: 0, position: "relative", width: "auto", maxWidth: "100%" }}>
              {replyingTo && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 12, color: LI_SECONDARY }}>
                  <span>Réponse à <strong>{replyingTo.author}</strong></span>
                  <button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 0 }} aria-label="Annuler la réponse"><X size={14} /></button>
                </div>
              )}
              {attachedMedia.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "2px 2px 0" }}>
                  {attachedMedia.map((item, index) => (
                    <div key={`${item.url}-${index}`} style={{ position: "relative", padding: 3, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 9 }}>
                      {item.type === "video" ? <video src={item.url} style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} /> : <img src={item.url} alt={item.label || "Média joint"} style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} />}
                      <button type="button" onClick={() => setAttachedMedia((current) => current.filter((_, mediaIndex) => mediaIndex !== index))} style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, border: `2px solid ${C.white}`, borderRadius: "50%", background: C.danger, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} aria-label="Retirer le média"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="post-viewer-input-row" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 44, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 24, boxSizing: "border-box" }}>
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                placeholder="Ajouter un commentaire..."
                className="post-viewer-comment-input"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 116px 10px 14px",
                  borderRadius: 24,
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: LI_TEXT,
                  background: "transparent",
                }}
              />
              <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 2 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia} aria-label="Ajouter une photo ou une vidéo" style={{ background: "none", border: "none", cursor: uploadingMedia ? "default" : "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%", opacity: uploadingMedia ? 0.5 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <ImageIcon size={17} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple onChange={handleMediaSelect} style={{ display: "none" }} />
                <button type="button" onClick={() => setShowEmoji((current) => !current)} aria-label="Ajouter un emoji" style={{ background: "none", border: "none", cursor: "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Smile size={17} />
                </button>
                <button type="button" onClick={handleCommentSubmit} disabled={(!commentText.trim() && !attachedMedia.length) || uploadingMedia} aria-label="Envoyer le commentaire" style={{ width: 28, height: 28, border: "none", borderRadius: "50%", background: (commentText.trim() || attachedMedia.length) && !uploadingMedia ? C.navy800 : C.line, color: C.white, cursor: (commentText.trim() || attachedMedia.length) && !uploadingMedia ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={13} />
                </button>
              </div>
              {showEmoji && <div className="emoji-picker-popover" style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 44, zIndex: 20 }}><Emojipicker emojis={["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "👏", "💡"]} onSelect={(emoji) => { setCommentText((current) => `${current}${emoji}`); setShowEmoji(false); }} size={30} /></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHARE MODAL ===== */}
      {shareOpen && (
        <ShareModal
          post={post}
          onClose={() => setShareOpen(false)}
          onRepost={() => onShare?.(post.id)}
        />
      )}
    </div>
  );
}