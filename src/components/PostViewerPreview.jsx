"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp, faLinkedin, faFacebook, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faPenNib } from "@fortawesome/free-solid-svg-icons";
import {
  X, Globe, Lock, Users2, MoreHorizontal, ThumbsUp, MessageCircle, Briefcase, MapPin, Megaphone,
  Share2, Bookmark, Send, Smile, ChevronDown, ChevronUp, Search, Check, Mail, ExternalLink, PlayCircle, Image as ImageIcon, Play, VolumeX, Volume2,
  ChevronLeft, ChevronRight, Pencil, Trash2, Flag, Link2, ShieldCheck,
  EyeOff, Copy, UserPlus, FileText, Download, Info, Maximize2,
} from "lucide-react";
import ReactionPicker from "@/components/ReactionPicker";
import Emojipicker from "@/components/Emojipicker";
import RelativeTime from "@/components/RelativeTime";
import { CommentSkeleton } from "@/components/Skeleton";
import EnterpriseBadge from "./EnterpriseBadge";
import PremiumBadge from "./PremiumBadge";
import ProfileHoverPreview from "./ProfileHoverPreview";
import { fetchBackendApi } from "@/lib/backend-api";
import VideoControls from "./VideoControls";

/* ==================================================================
 *  1. DESIGN TOKENS  (identité LynoraLink conservée : navy + or)
 * ================================================================== */
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

/* ==================================================================
 *  2. REACTIONS  (logique identique à l'original)
 * ================================================================== */
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

/* ==================================================================
 *  3. HELPERS  (logique identique à l'original)
 * ================================================================== */
function formatCount(n = 0) { return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} k` : String(n); }
function countComments(comments = []) { return comments.reduce((t, c) => t + 1 + countComments(c.replies || []), 0); }
function filterHiddenComments(comments = [], hiddenIds = []) {
  return comments
    .filter((comment) => !hiddenIds.includes(String(comment.id)))
    .map((comment) => ({ ...comment, replies: filterHiddenComments(comment.replies || [], hiddenIds) }));
}
function normalizeMedia(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try { return normalizeMedia(JSON.parse(trimmed)); } catch { /* URL string: keep it below. */ }
    }
  }
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((item) => {
    if (typeof item === "string") return { url: item, type: "image" };
    if (!item || typeof item !== "object") return item;
    const url = item.url || item.mediaUrl || item.src || item.imageUrl || item.path || null;
    const rawType = String(item.type || item.mediaType || item.mimeType || "").toLowerCase();
    const type = rawType.includes("video") || /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(url || "") ? "video" : "image";
    return { ...item, url, type };
  }).filter((item) => item?.url || item?.label || item?.name);
}
function getCommentMedia(comment) {
  if (Array.isArray(comment?.media)) return comment.media.filter((item) => item && item.url);
  const mediaData = comment?.mediaData ?? comment?.media;
  if (!mediaData) return [];
  if (typeof mediaData === "string") {
    try {
      const parsed = JSON.parse(mediaData);
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.url) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(mediaData)) return mediaData.filter((item) => item && item.url);
  if (mediaData && typeof mediaData === "object" && mediaData.url) return [mediaData];
  return [];
}
function isCommentOwnedByUser(comment, currentUser) {
  if (!comment || !currentUser) return false;
  const commentAuthorId = comment.authorId || comment.userId || comment.author?.id;
  return Boolean(comment.isOwn || (commentAuthorId && String(commentAuthorId) === String(currentUser.id)));
}
function findCommentById(comments = [], targetId) {
  for (const comment of comments) {
    if (String(comment.id) === String(targetId)) return comment;
    const nested = findCommentById(comment.replies || [], targetId);
    if (nested) return nested;
  }
  return null;
}
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

/* ==================================================================
 *  4. PETITS COMPOSANTS DE CONTENU
 * ================================================================== */
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
  const fileName = file?.name || file?.fileName || post?.fileName || "Fichier partag\u00e9";
  const fileSize = file?.size || post?.fileSize || file?.mimeType || "Document partag\u00e9 par le groupe";

  return (
    <div style={{ margin: "0 16px 16px", padding: "28px 24px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 13, border: `1px solid ${LI_BORDER}`, borderRadius: 12, background: "linear-gradient(145deg, #F7FAFC 0%, var(--app-bg) 100%)", textAlign: "center" }}>
      <div style={{ width: 96, height: 96, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, rgba(27,83,134,.14), rgba(27,83,134,.06))", color: C.navy800, boxShadow: "0 12px 28px rgba(27,83,134,.12)" }}>
        <FileText size={56} strokeWidth={1.6} />
      </div>
      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ color: LI_TEXT, fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
        <div style={{ marginTop: 5, color: LI_SECONDARY, fontSize: 13 }}>{fileSize}</div>
      </div>
      {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" download={fileName} aria-label={`T\u00e9l\u00e9charger ${fileName}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 9, background: C.navy800, color: C.white, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}><Download size={16} /> T\u00e9l\u00e9charger</a>}
    </div>
  );
}

/* ---- Sponsored-ad helpers (collapse text + action label) — logique inchangée ---- */
const SP_TEXT_THRESHOLD = 240;
const SP_TEXT_MAX_LINES = 6;

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
  return "D\u00e9couvrir";
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
        aria-label="Pourquoi vois-je cette publicit\u00e9 ?"
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
          Cette publication est sponsoris\u00e9e par LynoraLink.
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

  const description = post?.excerpt || post?.campaignDescription || post?.text || "";
  const descriptionLineCount = description.split("\n").length;
  const descriptionIsLong = description.length > SP_TEXT_THRESHOLD || descriptionLineCount > SP_TEXT_MAX_LINES;
  const descriptionPreview = descriptionIsLong
    ? spTruncateText(description, { charLimit: SP_TEXT_THRESHOLD, lineLimit: SP_TEXT_MAX_LINES }).truncated
    : description;
  const ellipsis = "\u2026";
  const displayedDescription = descriptionIsLong && !descriptionExpanded ? `${descriptionPreview}${ellipsis}` : description;

  const headline = post?.headline || post?.campaignTitle || post?.title || "";
  let displayDomain = "lynoralink.com";
  if (website) {
    try { displayDomain = new URL(website).hostname.replace(/^www\./, ""); } catch {}
  }

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
      style={{ display: "flex", flexDirection: "column", margin: "0 16px 16px" }}
    >
      <div className="pv-sponsored-header" style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 16px 6px" }}>
        <span style={{ color: C.gold600, fontSize: 13, fontWeight: 700, letterSpacing: ".01em" }}>Sponsoris\u00e9</span>
        <SponsoredInfo />
      </div>

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

      {media.length > 0 && <MediaGallery items={media} />}

      <div
        className="pv-sponsored-linkrow"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "10px 16px", background: LI_HOVER,
          borderTop: `1px solid ${LI_BORDER}`, borderBottom: `1px solid ${LI_BORDER}`,
        }}
      >
        <div className="pv-sponsored-linkinfo" style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline || "Publicit\u00e9"}</span>
          <span style={{ fontSize: 12, color: LI_SECONDARY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayDomain}</span>
        </div>
        {CtaElement}
      </div>

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

/* ==================================================================
 *  5. PRIMITIVES
 * ================================================================== */
function Avatar({ initials, size = 44, imgUrl = null, gradient = navyGrad, className = "" }) {
  return (
    <div className={className} style={{ width: size, height: size, borderRadius: "50%", background: imgUrl ? C.navy100 : gradient, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", flexShrink: 0, overflow: "hidden" }}>
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

/* ==================================================================
 *  6. MEDIA GALLERY  (logique du carousel inchangée, rendu FB)
 * ================================================================== */
const VIEWER_MEDIA_MIN_HEIGHT = 360;
const VIEWER_MEDIA_MAX_HEIGHT = 560;

function formatVideoDuration(seconds) {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function requestVideoFullscreen(node) {
  if (!node) return false;
  const candidates = ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"];
  const method = candidates.find((name) => typeof node[name] === "function");
  if (!method) return false;
  try {
    node[method]();
    return true;
  } catch (error) {
    return false;
  }
}

function ViewerVideo({ src, label, style = {} }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const durationLabel = formatVideoDuration(duration);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setIsMobileView(coarsePointer || window.innerWidth <= 768);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.muted = isMuted;
  }, [isMuted, isMobileView]);

  useEffect(() => {
    const node = videoRef.current;
    if (node) node.playbackRate = playbackRate;
  }, [playbackRate]);

  const toggleMute = (event) => {
    event?.stopPropagation?.();
    const node = videoRef.current;
    if (!node) return;
    const next = !node.muted;
    node.muted = next;
    setIsMuted(next);
  };

  const toggleFullscreen = (event) => {
    event?.stopPropagation?.();
    if (!videoRef.current) return;
    requestVideoFullscreen(videoRef.current);
  };

  const togglePlay = (event) => {
    event?.stopPropagation?.();
    const node = videoRef.current;
    if (!node) return;
    if (node.paused) node.play().catch(() => {});
    else node.pause();
  };

  const seek = (time) => {
    const node = videoRef.current;
    if (!node) return;
    node.currentTime = time;
    setCurrentTime(time);
  };

  const controls = (
    <VideoControls
      duration={duration}
      currentTime={currentTime}
      isPlaying={isPlaying}
      isMuted={isMuted}
      playbackRate={playbackRate}
      onTogglePlay={togglePlay}
      onToggleMute={toggleMute}
      onSeek={seek}
      onPlaybackRateChange={(rate) => setPlaybackRate(rate)}
      onFullscreen={toggleFullscreen}
    />
  );

  if (!src) {
    return (
      <div style={{ width: "100%", height: "100%", background: navyGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,0.9)", padding: 16, textAlign: "center" }}>
        <PlayCircle size={40} color={C.gold400} />
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label || "Vid\u00e9o"}</span>
      </div>
    );
  }

  if (isMobileView || started) {
    return (
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted={isMuted}
          playsInline
          aria-label={label || "Vid\\u00e9o"}
          onLoadedMetadata={(e) => setDuration(e.currentTarget?.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{ width: "100%", maxWidth: "100%", height: "auto", maxHeight: "none", objectFit: "contain", display: "block", background: "transparent", margin: "0 auto", ...style }}
        />
        {controls}
      </div>
    );
  }

  const startPreview = () => {
    const node = videoRef.current;
    if (!node) return;
    node.muted = true;
    node.play().then(() => setPreviewing(true)).catch(() => setPreviewing(false));
  };
  const stopPreview = () => {
    const node = videoRef.current;
    try {
      node?.pause();
      if (node && node.readyState >= 1) node.currentTime = 0;
    } catch { /* lecteur absent : ignor\u00e9 */ }
    setPreviewing(false);
  };
  const handleActivate = (e) => {
    e?.stopPropagation?.();
    stopPreview();
    setStarted(true);
  };

  return (
    <div
      className="pv-video-stage"
      role="button"
      tabIndex={0}
      aria-label={label || "Lire la vidéo"}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(e); }
      }}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      style={{
        position: "relative",
        width: "100%",
        height: "auto",
        maxHeight: "none",
        background: isMobileView ? "transparent" : "#000",
        overflow: "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        ...style,
      }}
    >
      <video
        ref={videoRef}
        className="pv-video-frame"
        src={src}
        preload="metadata"
        muted={isMuted}
        playsInline
        aria-hidden="true"
        tabIndex={-1}
        onLoadedMetadata={(e) => setDuration(e.currentTarget?.duration)}
        style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", pointerEvents: "none" }}
      />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(4,10,24,0.12)", pointerEvents: "none" }} />
      {previewing && (
        <div
          className="pv-video-muted"
          aria-hidden="true"
          style={{
            position: "absolute", top: 10, left: 10, zIndex: 2,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(0,0,0,0.65)", color: "#fff",
            padding: "3px 8px", borderRadius: 999,
            fontSize: 11, fontWeight: 700, fontFamily: "'Sora', sans-serif",
            pointerEvents: "none",
          }}
        >
          <VolumeX size={12} /> Muet
        </div>
      )}
      <button
        type="button"
        aria-label="Lecture plein écran"
        onClick={toggleFullscreen}
        style={{
          position: "absolute", right: 10, bottom: 10, zIndex: 2,
          width: 28, height: 28, borderRadius: "50%", border: "none",
          background: "rgba(0,0,0,0.62)", color: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <Maximize2 size={14} />
      </button>
      {!previewing && (
        <span
          className="pv-video-play"
          aria-hidden="true"
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(255,255,255,0.96)",
            color: C.navy800,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        >
          <Play size={26} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />
        </span>
      )}
      {durationLabel && (
        <span
          className="pv-video-duration"
          aria-hidden="true"
          style={{
            position: "absolute", right: 10, bottom: 10,
            background: "rgba(0,0,0,0.72)", color: "#fff",
            padding: "2px 7px", borderRadius: 6,
            fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
            fontFamily: "'Sora', sans-serif", pointerEvents: "none",
          }}
        >
          {durationLabel}
        </span>
      )}
    </div>
  );
}

function ViewerCommentVideo({ src, label, width = 120, height = 80 }) {
  const [started, setStarted] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setIsMobileView(coarsePointer || window.innerWidth <= 768);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (isMobileView || started) {
    return (
      <video
        src={src}
        controls={started && !isMobileView}
        autoPlay
        muted={isMobileView}
        playsInline
        aria-label={label || "Vid\u00e9o du commentaire"}
        style={{ width, height, objectFit: "cover", borderRadius: 8, display: "block", background: "transparent" }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label || "Lire la vid\u00e9o du commentaire"}
      onClick={() => setStarted(true)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStarted(true); } }}
      className="pv-comment-video"
      style={{ position: "relative", display: "block", width, height, borderRadius: 8, overflow: "hidden", background: "#000", cursor: "pointer", flexShrink: 0 }}
    >
      <video src={src} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
      <span aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.62)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <Play size={10} fill="currentColor" strokeWidth={0} />
      </span>
    </span>
  );
}

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
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      maxHeight: "none",
      objectFit: "contain",
      objectPosition: "center center",
      display: "block",
      background: "#000",
      margin: "0 auto",
    };
    if (item.type === "video") return <ViewerVideo key={index} src={item.url} label={item.label} />;
    return <img key={index} src={item.url} alt={item.label || `M\u00e9dia ${index + 1}`} style={mediaStyle} />;
  };
  return (
    <div style={{ borderRadius: 0, overflow: "visible", margin: 0 }}>
      <div
        className="post-viewer-media"
        style={{
          position: "relative",
          minHeight: 0,
          height: "auto",
          maxHeight: "none",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          borderRadius: 0,
        }}
      >
        {count > 1 && (
          <span
            className="pv-media-counter"
            aria-hidden="true"
            style={{
              position: "absolute", top: 10, right: 12, zIndex: 4,
              background: "rgba(0,0,0,0.65)", color: "#fff",
              padding: "2px 9px", borderRadius: 999,
              fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
              fontFamily: "'Sora', sans-serif",
              pointerEvents: "none",
            }}
          >
            {activeIndex + 1}/{count}
          </span>
        )}
        {renderItem(currentItem, activeIndex)}
        {count > 1 && (
          <>
            <button
              type="button"
              className="post-viewer-slider-button post-viewer-slider-previous"
              onClick={showPrevious}
              aria-label="M\u00e9dia pr\u00e9c\u00e9dent"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="post-viewer-slider-button post-viewer-slider-next"
              onClick={showNext}
              aria-label="M\u00e9dia suivant"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "8px 0 0", overflowX: "auto", scrollbarWidth: "thin" }}>
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Afficher le média ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              style={{ flex: "0 0 76px", width: 76, height: 56, boxSizing: "border-box", padding: 0, border: index === activeIndex ? `2px solid ${C.navy800}` : `1px solid ${LI_BORDER}`, borderRadius: 8, overflow: "hidden", background: "#000", cursor: "pointer", opacity: index === activeIndex ? 1 : 0.7 }}
            >
              {item?.url ? (
                item.type === "video" ? (
                  <span style={{ position: "relative", display: "block", width: "100%", height: "100%", background: "#000" }}>
                    <video src={item.url} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }} />
                    <span aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.62)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <Play size={9} fill="currentColor" strokeWidth={0} />
                    </span>
                  </span>
                ) : (
                  <img src={item.url} alt={item.label || `Média ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center center", display: "block" }} />
                )
              ) : (
                <div style={{ width: "100%", height: "100%", background: navyGrad }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================
 *  7. BOUTONS D'ACTION & MENUS
 * ================================================================== */
/* Réaction au post : hover desktop + appui long mobile (logique conservée) */
function ReactionButton({ reaction, onReact, onToggleLike }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);
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
      <button className="post-viewer-action-btn" onClick={onToggleLike} style={{ width: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 4px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: isLiked ? C.gold600 : C.muted, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        {current ? <ReactionIcon reaction={current} selected size={22} /> : <ThumbsUp size={22} color={C.muted} />}
        <span>{current?.label || "J'aime"}</span>
      </button>
    </div>
  );
}

/* Bouton d'action façon Facebook (pleine largeur, hover gris clair) */
function ActionBtn({ icon: Icon, label, active, onClick }) {
  const color = active ? LINKEDIN_BLUE : LI_SECONDARY;
  return (
    <button className="post-viewer-action-btn" onClick={onClick} style={{ width: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 4px", border: "none", background: "transparent", cursor: "pointer", color, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", borderRadius: 8, transition: "background 0.15s ease, color 0.15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={20} fill={active ? LINKEDIN_BLUE : "none"} color={color} />
      <span>{label}</span>
    </button>
  );
}

/* Menu contextuel du post */
function MoreMenu({ isOwn, onEdit, onDelete, onReport, onCopyLink, onClose }) {
  const Item = ({ label, onClick: onClk, danger }) => (
    <button onClick={onClk} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: danger ? C.danger : LI_TEXT, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : LI_HOVER)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{label}</button>
  );
  return (
    <div style={{ position: "absolute", top: 40, right: 0, width: 240, background: C.white, borderRadius: 8, border: `1px solid ${LI_BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 30, overflow: "hidden", padding: "4px 0" }} role="menu" aria-label="Options de la publication">
      {isOwn ? (<><Item label="Modifier la publication" onClick={onEdit} /><Item label="Supprimer la publication" danger onClick={onDelete} /></>) : <Item label="Signaler cette publication" danger onClick={onReport} />}
      <div style={{ height: 1, background: LI_BORDER, margin: "4px 0" }} />
      <Item label="Copier le lien" onClick={onCopyLink} />
    </div>
  );
}

/* ==================================================================
 *  8. SHARE MODAL  (logique inchangée, habillage FB)
 * ================================================================== */
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
  const shareText = post?.text || post?.headline || "D\u00e9couvrez cette publication sur LynoraLink.";
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
      setStatus(`${selectedUsers.length} message${selectedUsers.length > 1 ? "s" : ""} envoy\u00e9${selectedUsers.length > 1 ? "s" : ""}.`);
      setTimeout(onClose, 500);
    } catch {
      setStatus("Le message n'a pas pu \u00eatre envoy\u00e9.");
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
          title: post?.headline || "Publication partag\u00e9e",
          excerpt: post?.excerpt || "",
          isArticle: Boolean(post?.isArticle || post?.headline),
          media: Array.isArray(post?.media) ? post.media : post?.coverUrl ? [{ type: "image", url: post.coverUrl, name: post.headline || "Image de couverture" }] : [],
          text: shareText,
        }),
      });
      if (!response.ok) throw new Error("group");
      onRepost?.();
      setStatus(`Publication partag\u00e9e dans ${selectedGroup.name}.`);
      setTimeout(onClose, 700);
    } catch {
      setStatus("Le partage dans ce groupe est impossible.");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(postUrl);
    onRepost?.();
    setStatus("Lien copi\u00e9.");
  };

  return (
    <div className="post-share-overlay" style={{ position: "fixed", inset: 0, background: "rgba(8,28,48,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }} onClick={onClose}>
      <div className="post-share-modal" onClick={(event) => event.stopPropagation()} style={{ width: "95%", maxWidth: 500, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", background: C.white, borderRadius: 12, boxShadow: "0 30px 60px rgba(0,0,0,.22)" }}>
        {/* Header façon FB : titre centré + croix à droite */}
        <div style={{ padding: "16px 52px", borderBottom: `1px solid ${LI_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: LI_TEXT, margin: 0 }}>Partager la publication</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", border: "none", background: C.navy50, color: LI_TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        {/* Onglets */}
        <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", flexShrink: 0, overflowX: "auto", borderBottom: `1px solid ${LI_BORDER}` }}>
          {[{ key: "message", label: "Message", icon: Send }, { key: "group", label: "Groupe", icon: Users2 }, { key: "social", label: "R\u00e9seaux", icon: ExternalLink }].map(({ key, label, icon: Icon }) => (
            <button type="button" key={key} onClick={() => { setTab(key); setStatus(""); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px 11px", border: "none", borderBottom: `2.5px solid ${tab === key ? C.navy800 : "transparent"}`, background: "transparent", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: tab === key ? C.navy800 : C.mutedLight, cursor: "pointer", marginRight: 12, whiteSpace: "nowrap" }}><Icon size={14} />{label}</button>
          ))}
        </div>
        <div style={{ padding: "16px 20px 20px", overflowY: "auto", fontFamily: "'Sora', sans-serif" }}>
          {tab === "message" && <>
            <label style={{ display: "block", marginBottom: 8, color: C.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Membres de la plateforme</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 999, padding: "10px 14px", marginBottom: 8, background: LI_HOVER }}><Search size={14} color={C.mutedLight} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14 }} /></div>
            <div style={{ maxHeight: 210, minHeight: 120, overflowY: "auto", padding: "4px 0" }}>{filteredUsers.map((user) => { const selected = selectedUsers.some((selectedUser) => selectedUser.id === user.id); return <button type="button" key={user.id} onClick={() => setSelectedUsers((current) => selected ? current.filter((selectedUser) => selectedUser.id !== user.id) : [...current, user])} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", borderRadius: 12, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2 }}><Avatar initials={(user.name || "U").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()} imgUrl={user.image} size={34} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{user.name}</span><span style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{selected ? <Check size={12} color={C.white} /> : null}</span></button>; })}</div>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ajouter un message (facultatif)" rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: 10, border: `1px solid ${C.line}`, borderRadius: 12, resize: "vertical", background: LI_HOVER, fontFamily: "inherit", fontSize: 14 }} />
            <div style={{ padding: "14px 0 0", marginTop: 4, borderTop: `1px solid ${C.line}` }}><button type="button" disabled={!selectedUsers.length} onClick={sendMessage} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", border: "none", borderRadius: 8, background: navyGrad, color: C.white, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: selectedUsers.length ? "pointer" : "not-allowed", opacity: selectedUsers.length ? 1 : .55 }}><Send size={14} />Envoyer à {selectedUsers.length || "..."} destinataire{selectedUsers.length > 1 ? "s" : ""}</button></div>
          </>}
          {tab === "group" && <>
            <p style={{ margin: "0 0 12px", color: LI_SECONDARY, fontSize: 13 }}>Choisissez un groupe dont vous \u00eates membre.</p>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>{shareableGroups.map((group) => {
              const groupCoverUrl = group.coverUrl || group.cover || group.bannerUrl || group.backgroundImage || group.avatarUrl || null;
              const isSelected = selectedGroup?.id === group.id;
              return (
                <button type="button" key={group.id} onClick={() => setSelectedGroup(group)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 10, border: "none", borderRadius: 8, background: isSelected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span aria-hidden="true" style={{ width: 48, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, overflow: "hidden", background: group.coverGradient || navyGrad, backgroundImage: groupCoverUrl ? `url(${groupCoverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", color: C.white, fontSize: 20, boxShadow: "0 1px 3px rgba(0,0,0,.14)" }}>{!groupCoverUrl && (group.emoji || "\ud83c\udf10")}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 600 }}>{group.name}</span>
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

/* ==================================================================
 *  9. TEXTE DU POST + VISIBILIT\u00c9
 * ================================================================== */
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

function VisibilityIcon({ visibility }) {
  const v = (visibility || "public").toLowerCase();
  if (v === "private" || v === "connections") return <Users2 size={14} style={{ color: LI_SECONDARY }} />;
  if (v === "locked" || v === "only_me") return <Lock size={14} style={{ color: LI_SECONDARY }} />;
  return <Globe size={14} style={{ color: LI_SECONDARY }} />;
}

/* ==================================================================
 * 10. COMMENTAIRE (logique conservée, habillage FB)
 * ================================================================== */
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
  const isCommentOwner = isCommentOwnedByUser(comment, currentUser);
  const isPostAuthorComment = Boolean(postAuthorId && commentAuthorId && String(commentAuthorId) === String(postAuthorId));

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

    if (onToggleCommentReaction) {
      try {
        await onToggleCommentReaction(postId, comment.id, reactionKey);
      } catch (error) {
        console.error("Erreur lors de la r\u00e9action au commentaire:", error);
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
          {/* Bulle texte façon FB */}
          <div className="pv-comment-bubble">
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {comment.authorId ? <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || comment.authorId) : comment.authorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}><Link href={comment.authorType === "page" ? `/feed?view=company&pageId=${encodeURIComponent(comment.companyPageId || comment.authorId)}` : `/feed?view=profile&userId=${encodeURIComponent(comment.authorId)}`} style={{ fontWeight: 700, fontSize: 13.5, color: LI_TEXT, textDecoration: "none" }}>{comment.author}</Link></ProfileHoverPreview> : <span style={{ fontWeight: 700, fontSize: 13.5, color: LI_TEXT }}>{comment.author}</span>}
              {isPostAuthorComment && (
                <span
                  title="Auteur de la publication"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    color: C.navy900,
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                  }}
                >
                  <FontAwesomeIcon icon={faPenNib} style={{ fontSize: 10, color: C.navy900 }} />
                  <span>Auteur</span>
                </span>
              )}
              {comment.isPlatformAdmin && <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />}
              {!comment.isPlatformAdmin && comment.isPremium && <PremiumBadge size={13} />}
              {comment.connectionBadge && (
                <span style={{ fontSize: 12, color: LI_SECONDARY }}>&middot; {comment.connectionBadge}</span>
              )}
            </div>
            {comment.headline && (
              <div style={{ fontSize: 12, color: LI_SECONDARY, marginTop: 1, lineHeight: 1.4 }}>{comment.headline}</div>
            )}
            {isEditing ? (
              <div style={{ marginTop: 6 }}>
                <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} style={{ width: "100%", padding: 8, border: `1px solid ${LI_INPUT_BORDER}`, borderRadius: 8, resize: "vertical", font: "inherit" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button type="button" onClick={async () => { if (editText.trim()) { await onEditComment?.(comment.id, editText.trim()); setDisplayText(editText.trim()); setIsEditing(false); } }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: C.navy800, color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Enregistrer</button>
                  <button type="button" onClick={() => { setEditText(comment.text || ""); setIsEditing(false); }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: C.navy50, color: LI_SECONDARY, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: LI_TEXT, lineHeight: 1.45, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{displayText}</div>
            )}
            {(() => {
              const commentMedia = getCommentMedia(comment);
              return commentMedia.length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {commentMedia.map((item, index) => item?.url ? (
                    item.type === "video"
                      ? <ViewerCommentVideo key={index} src={item.url} label={item.label} />
                      : <img key={index} src={item.url} alt={item.label || "M\u00e9dia du commentaire"} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  ) : null)}
                </div>
              ) : null;
            })()}
          </div>
          {/* Badge r\u00e9actions (coin bas-droit de la bulle, comme FB) */}
          {(comment.totalReactions || 0) > 0 && (
            <span className="pv-comment-reactions" aria-hidden="true">
              {comment.reactionKeys?.map((key) => reactionByKey(key)).filter(Boolean).slice(0, 3).map((item) => <img key={item.key} src={item.src} alt={item.label} style={{ width: 13, height: 13, objectFit: "contain", borderRadius: 3 }} />)}
              <span>{comment.totalReactions}</span>
            </span>
          )}
          {/* Actions J'aime / R\u00e9pondre / heure / menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, paddingLeft: 4, color: LI_SECONDARY, fontSize: 12.5, fontWeight: 600 }}>
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
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: localReaction ? C.gold600 : LI_SECONDARY, padding: "4px 0" }}
              >
                {localReaction ? <ReactionIcon reaction={localReaction} selected size={13} /> : <ThumbsUp size={13} />}
                {reactionByKey(localReaction)?.label || "J'aime"}
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
            &middot;
            <button onClick={() => { setReplying(false); onStartReply?.(comment); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: LI_SECONDARY, padding: "4px 0" }}>Répondre</button>
            &middot;
            <span style={{ fontSize: 12, fontWeight: 500 }}><RelativeTime date={comment.time} /></span>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button type="button" onClick={() => setShowMenu((value) => !value)} aria-label="Options du commentaire" aria-expanded={showMenu} style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 4, borderRadius: "50%" }}><MoreHorizontal size={15} /></button>
              {showMenu && (
                <div className="post-viewer-comment-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onReportComment?.(comment.id); }}><Flag size={14} /> Signaler</button>
                  {isCommentOwner && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onHideComment?.(comment.id); }}><EyeOff size={14} /> Masquer</button>}
                  {isCommentOwner && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setIsEditing(true); }}><Pencil size={14} /> Modifier</button>}
                  {isCommentOwner && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onDeleteComment?.(comment.id); }} className="post-viewer-comment-menu-danger"><Trash2 size={14} /> Supprimer</button>}
                </div>
              )}
            </div>
          </div>
          {/* R\u00e9ponse inline (comme FB) */}
          {replying && (
            <div className="pv-comment-reply-row">
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply()} placeholder={`\u00c9crire une r\u00e9ponse...`} className="pv-reply-input" />
              <button onClick={submitReply} disabled={!replyText.trim()} style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: replyText.trim() ? LINKEDIN_BLUE : LI_BORDER, color: replyText.trim() ? C.white : LI_SECONDARY, fontWeight: 700, fontSize: 12.5, cursor: replyText.trim() ? "pointer" : "default" }}>Envoyer</button>
            </div>
          )}
        </div>
      </div>
      {/* R\u00e9ponses imbriqu\u00e9es (logique conserv\u00e9e) */}
      {comment.replies && comment.replies.length > 0 && (
        <button
          type="button"
          onClick={() => setShowReplies((value) => !value)}
          aria-expanded={showReplies}
          className="pv-replies-toggle"
        >
          {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showReplies ? "Masquer les r\u00e9ponses" : `Afficher les ${comment.replies.length} r\u00e9ponse${comment.replies.length > 1 ? "s" : ""}`}
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

/* ==================================================================
 * 11. COMPOSANT PRINCIPAL  —  rendu fa\u00e7on Facebook
 *     Desktop : carte centr\u00e9e unique (contenu + actions + commentaires)
 *     Mobile  : plein \u00e9cran, header avec retour, composer fix\u00e9 bas
 * ================================================================== */
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
  const [commentsLocked, setCommentsLocked] = useState(Boolean(post?.commentsLocked || post?.commentingLocked));
  const [commentatorsLimit, setCommentatorsLimit] = useState(Number(post?.commentatorsLimit ?? post?.commentLimit ?? 0));
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const commentInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFilePostContent = isFilePost(post);
  const isSponsoredPost = Boolean(post?.isSponsored || post?.campaignId);
  const emptyCommentsMessage = isSponsoredPost
    ? "Aucun commentaire pour cette publication sponsorisée."
    : "Soyez le premier à commenter cette publication.";
  const isJobPost = post?.variant === "job";
  const jobId = post?.jobId || post?.id;
  const [jobEngagement, setJobEngagement] = useState(null);
  const engagementRequestRef = useRef(0);

  /* --- Polling engagement jobs (logique inchangée) --- */
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
    }, 10000);
    return () => window.clearInterval(interval);
  }, [isJobPost, post?.companyPageId, jobId]);

  useEffect(() => {
    setShowAllComments(false);
  }, [post?.id]);

  useEffect(() => {
    if (!post?.id) {
      setCommentsLoading(true);
      return;
    }

    const hasCommentPayload = post?.comments !== undefined && post?.comments !== null;
    setCommentsLoading(Boolean(post?.loadingComments || !hasCommentPayload));
  }, [post?.id, post?.comments, post?.loadingComments]);

  useEffect(() => {
    setCommentsLocked(Boolean(post?.commentsLocked || post?.commentingLocked));
    setCommentatorsLimit(Number(post?.commentatorsLimit ?? post?.commentLimit ?? 0));
  }, [post?.id, post?.commentsLocked, post?.commentingLocked, post?.commentatorsLimit, post?.commentLimit]);

  /* --- Données dérivées (logique inchangée) --- */
  const viewerPost = isJobPost && jobEngagement ? { ...post, ...jobEngagement } : post;
  const media = [
    viewerPost?.media,
    viewerPost?.images,
    viewerPost?.mediaData,
    viewerPost?.mediaUrl,
    viewerPost?.imageUrl,
    viewerPost?.image,
    viewerPost?.coverUrl,
  ].reduce((resolved, candidate) => resolved.length > 0 ? resolved : normalizeMedia(candidate), []);
  const comments = Array.isArray(viewerPost?.comments)
    ? (isJobPost ? decorateJobComments(viewerPost.comments, currentUser?.id) : viewerPost.comments)
    : [];
  const visibleCommentSource = commentsLocked ? [] : filterHiddenComments(comments, hiddenCommentIds);
  const uniqueCommenterIds = new Set(
    comments
      .map((comment) => comment.authorId || comment.userId || comment.author?.id)
      .filter(Boolean)
      .map((id) => String(id))
  );
  const currentUserHasCommented = comments.some((comment) => {
    const commentAuthorId = comment.authorId || comment.userId || comment.author?.id;
    return Boolean(commentAuthorId && currentUser && String(commentAuthorId) === String(currentUser.id));
  });
  const userOwnedHiddenCommentIds = hiddenCommentIds.filter((id) => {
    const hiddenComment = findCommentById(comments, id);
    return hiddenComment && isCommentOwnedByUser(hiddenComment, currentUser);
  });
  const reaction = isJobPost
    ? Object.entries(jobEngagement?.reactions || {}).find(([, ids]) => ids.includes(currentUser?.id))?.[0] || null
    : post?.reaction || (post?.liked ? "ok" : null);
  const commentersLimitValue = Number(commentatorsLimit) || 0;
  const isCommentLimitReached = commentersLimitValue > 0 && uniqueCommenterIds.size >= commentersLimitValue && !currentUserHasCommented;
  const isCommentingBlocked = commentsLocked || isCommentLimitReached;
  const commentingNotice = commentsLocked
    ? "Les commentaires sont actuellement verrouillés par l’auteur de la publication."
    : isCommentLimitReached
      ? `La limite de ${commentersLimitValue} commentateur${commentersLimitValue > 1 ? "s" : ""} est atteinte.`
      : "";
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

  /* --- Handlers (logique inchangée) --- */
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
    if ((!commentText.trim() && !attachedMedia.length) || uploadingMedia || isCommentingBlocked) return;
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

  const persistCommentSettings = async (nextLocked, nextLimit) => {
    if (!post?.id || !isOwn) return;
    const response = await fetchBackendApi(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commentsLocked: Boolean(nextLocked),
        commentatorsLimit: Number.isFinite(Number(nextLimit)) && Number(nextLimit) >= 0 ? Math.max(0, Math.floor(Number(nextLimit))) : 0,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Impossible de sauvegarder les réglages de commentaires.");
    }
    if (data?.post) {
      setCommentsLocked(Boolean(data.post.commentsLocked));
      setCommentatorsLimit(Number(data.post.commentatorsLimit || 0));
    }
  };

  const handleSendPost = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    const shareData = {
      title: post?.headline || `Publication de ${post?.author || "LynoraLink"}`,
      text: post?.text || post?.excerpt || "D\u00e9couvrez cette publication sur LynoraLink.",
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
  const jobTitle = post?.title || post?.jobTitle || "Opportunit\u00e9 professionnelle";
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
    if (!response.ok) throw new Error("Impossible de r\u00e9agir au commentaire");
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
    if (!response.ok) throw new Error("Impossible de r\u00e9pondre au commentaire");
    const result = await response.json();
    setJobEngagement((current) => ({ ...current, comments: result.comments || current?.comments || [] }));
  };
  const handleHideComment = (commentId) => {
    const targetComment = findCommentById(comments, commentId);
    if (!isCommentOwnedByUser(targetComment, currentUser)) return;
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
    const reason = window.prompt("Pourquoi signalez-vous ce commentaire ?", "Contenu inappropri\u00e9");
    if (!reason) return;
    await fetchBackendApi("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "comment", targetId: String(commentId), targetLabel: `Commentaire ${commentId}`, reason, details: "Signalement depuis le viewer de publication" }),
    });
  };

  /* ---- Libellé du compteur de réactions (façon FB) ---- */
  const reactionSummary = (() => {
    if (reactionCount <= 0) return "";
    if (reaction) return reactionCount > 1 ? `Vous et ${reactionCount - 1} autre${reactionCount - 1 > 1 ? "s" : ""} personne${reactionCount - 1 > 1 ? "s" : ""}` : "Vous";
    return formatCount(reactionCount);
  })();

  return (
    <div className="post-viewer-overlay" onClick={onClose}>
      {/* ===== STYLES (mêmes tokens, agencement Facebook) ===== */}
      <style>{`
        .post-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          background: rgba(8, 28, 48, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          backdrop-filter: blur(6px);
        }
        /* ---- Carte unique façon Facebook ---- */
        .post-viewer-card {
          width: min(680px, 100%);
          max-height: min(90vh, 900px);
          height: min(90vh, 900px);
          background: var(--app-surface);
          border-radius: 12px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
        }
        /* ---- Header : titre centré + croix, comme FB ---- */
        .post-viewer-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 12px 52px 11px;
          min-height: 58px;
          border-bottom: 1px solid var(--app-border);
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(244,247,250,0.96) 100%);
          color: var(--app-text);
          font-size: 15px;
          font-weight: 800;
          font-family: 'Sora', sans-serif;
          flex-shrink: 0;
          box-sizing: border-box;
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
        }
        .post-viewer-header-title {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.01em;
          color: var(--app-text);
        }
        .post-viewer-close {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border: 1px solid var(--app-border);
          border-radius: 50%;
          background: var(--app-bg);
          color: var(--app-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          z-index: 2;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
        }
        .post-viewer-close:hover {
          background: var(--app-input);
          border-color: rgba(148, 163, 184, 0.6);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
        }
        .pv-back-btn {
          display: none;
        }
        /* ---- Zone scrollable unique ---- */
        .post-viewer-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #7890a5 #edf3f8;
          -webkit-overflow-scrolling: touch;
        }
        .post-viewer-scroll::-webkit-scrollbar { width: 10px; }
        .post-viewer-scroll::-webkit-scrollbar-thumb { background: #7890a5; border: 2px solid #edf3f8; border-radius: 10px; }
        .post-viewer-scroll::-webkit-scrollbar-track { background: #edf3f8; }
        /* ---- Author header sticky ---- */
        .post-viewer-author-header {
          position: relative;
          top: auto;
          z-index: auto;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,252,0.98) 100%);
          border-bottom: 1px solid rgba(15, 51, 82, 0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }
        /* ---- Stats de réactions façon FB ---- */
        .pv-stats-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 16px 8px;
          color: var(--app-muted);
          font-size: 13px;
          font-weight: 600;
        }
        .pv-stats-reactions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 2px 4px;
          margin-left: -4px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--app-muted);
          font: inherit;
        }
        .pv-stats-reactions:hover { background: var(--app-bg); }
        .pv-stats-bubbles { display: inline-flex; flex-shrink: 0; }
        .pv-stats-bubbles > span {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--app-surface);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        .pv-stats-bubbles > span + span { margin-left: -5px; }
        .pv-stats-right {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          padding: 2px 4px;
          margin-right: -4px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--app-muted);
          font: inherit;
          text-align: left;
          white-space: nowrap;
        }
        .pv-stats-right:hover { background: var(--app-bg); }
        /* ---- Barre d'actions façon FB ---- */
        .pv-actions {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2px;
          padding: 2px 8px;
          align-items: stretch;
          border-top: 1px solid var(--app-border);
          border-bottom: 1px solid var(--app-border);
          background: var(--app-surface);
          flex-shrink: 0;
        }
        .post-viewer-action-btn:active { transform: scale(0.96); }
        /* ---- Séparateur commentaires ---- */
        .pv-comments-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px 4px;
          flex-shrink: 0;
        }
        .pv-comments-header-title { font-weight: 700; font-size: 15px; color: var(--app-text); white-space: nowrap; }
        .pv-comments-list { display: flex; flex-direction: column; gap: 12px; padding: 8px 16px 16px; }
        .pv-comments-list > div:last-child { border-bottom: none; }
        /* ---- Bulle de commentaire façon FB ---- */
        .pv-comment-bubble {
          background: var(--app-input);
          border-radius: 18px;
          padding: 8px 12px;
          min-width: 0;
        }
        .pv-comment-reactions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: -10px;
          margin-left: 8px;
          padding: 3px 8px 3px 4px;
          border-radius: 999px;
          background: var(--app-surface);
          border: 1px solid var(--app-border);
          box-shadow: 0 1px 3px rgba(15, 51, 82, 0.12);
          font-size: 12px;
          font-weight: 600;
          color: var(--app-muted);
          position: relative;
          z-index: 1;
        }
        .pv-comment-reply-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .pv-reply-input {
          flex: 1;
          min-width: 0;
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid var(--app-border);
          outline: none;
          font-size: 13px;
          background: var(--app-surface);
          color: var(--app-text);
        }
        .pv-replies-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 4px 0 0 50px;
          padding: 4px 0;
          background: none;
          border: none;
          color: var(--app-muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }
        .pv-replies-toggle:hover { text-decoration: underline; }
        /* ---- Menu contextuel commentaires ---- */
        .post-viewer-comment-menu {
          position: absolute;
          right: calc(100% + 8px);
          top: 0;
          z-index: 30;
          min-width: 180px;
          overflow: hidden;
          background: var(--app-surface);
          border: 1px solid var(--app-border);
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
          color: var(--app-text);
          text-align: left;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .post-viewer-comment-menu button:hover { background: var(--app-bg); }
        .post-viewer-comment-menu button.post-viewer-comment-menu-danger { background: #FBEDED; color: #C24444; }
        .post-viewer-comment-menu button.post-viewer-comment-menu-danger:hover { background: #F6E2E2; }
        /* ---- Composer façon FB (sticky bas de carte) ---- */
        .post-viewer-composer {
          position: sticky;
          bottom: 0;
          z-index: 12;
          padding: 10px 16px;
          padding-bottom: max(10px, 0px);
          border-top: 1px solid var(--app-border);
          background: var(--app-surface);
          box-sizing: border-box;
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          max-width: 100%;
          min-height: 64px;
          overflow: visible;
        }
        /* ---- Galerie média ---- */
        .post-viewer-media { min-height: 0; }
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
        /* ---- Vidéo façon FB ---- */
        .pv-video-stage { -webkit-tap-highlight-color: transparent; }
        .pv-video-stage:focus-visible { outline: 3px solid rgba(238,175,35,0.5); outline-offset: -3px; }
        .pv-video-play { transition: transform 0.16s ease, box-shadow 0.16s ease; }
        .pv-video-stage:hover .pv-video-play {
          transform: translate(-50%, -50%) scale(1.08) !important;
          box-shadow: 0 4px 22px rgba(238,175,35,0.55) !important;
        }
        .pv-video-muted, .pv-video-duration, .pv-media-counter { font-variant-numeric: tabular-nums; }
        .pv-comment-video { -webkit-tap-highlight-color: transparent; }
        .pv-comment-video:focus-visible { outline: 2px solid rgba(238,175,35,0.5); outline-offset: 1px; }
        /* ---- Sponsorisé ---- */
        .post-viewer-sponsored-card { overflow: visible !important; }
        .post-viewer-sponsored-card .post-viewer-media {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          border-radius: 0 !important;
        }
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
          .pv-sponsored-block, .pv-sponsored-cta, .pv-sponsored-wa { transition: none !important; }
          .pv-sponsored-cta:hover { transform: none; }
        }
        /* ---- Job card ---- */
        .post-viewer-job-card {
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #7890a5 #edf3f8;
        }
        .post-viewer-job-card::-webkit-scrollbar { width: 10px; }
        .post-viewer-job-card::-webkit-scrollbar-thumb { background: #7890a5; border: 2px solid #edf3f8; border-radius: 10px; }
        .post-viewer-job-card::-webkit-scrollbar-track { background: #edf3f8; }
        .post-viewer-job-description {
          height: auto;
          max-height: none;
          overflow: visible;
          overflow-x: hidden;
        }
        .reaction-picker { border-radius: 999px !important; }
        /* ================= MOBILE (façon Facebook app) ================= */
        @media (max-width: 900px) {
          .post-viewer-overlay {
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
          .post-viewer-card {
            width: 100vw !important;
            max-width: none !important;
            min-width: 100vw !important;
            height: 100dvh !important;
            min-height: 0 !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            overflow-x: hidden !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            box-sizing: border-box !important;
          }
          /* Header FB mobile : flèche retour + titre + croix */
          .post-viewer-header {
            justify-content: flex-start !important;
            padding: 8px 52px 8px 10px !important;
            min-height: 52px;
            position: sticky !important;
            top: 0 !important;
            z-index: 40 !important;
          }
          .post-viewer-author-header {
            padding: 8px 12px 8px !important;
            gap: 8px !important;
          }
          .post-viewer-author-avatar {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            font-size: 13px !important;
          }
          .post-viewer-header::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 34px;
            height: 34px;
            border-radius: 50%;
          }
          .pv-back-btn {
            position: absolute !important;
            left: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 34px !important;
            height: 34px !important;
            display: flex !important;
          }
          .pv-header-title-mobile {
            max-width: calc(100% - 108px) !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            text-align: center;
          }
          .post-viewer-header .post-viewer-close {
            right: 10px !important;
            background: var(--app-input) !important;
            color: var(--app-text) !important;
            box-shadow: none;
            transform: translateY(-50%);
          }
          /* Boutons d'action : icônes seules centrées (comme FB) */
          .pv-actions { gap: 0; }
          .post-viewer-action-btn {
            flex: 1 1 0 !important;
            width: auto !important;
            min-width: 0 !important;
            gap: 0 !important;
            min-height: 44px;
            font-size: 13px !important;
          }
          .post-viewer-action-btn > span { display: none !important; }
          .post-viewer-action-btn:focus-visible { outline: 2px solid rgba(44,107,160,0.45); }
          /* Composer fixé en bas + safe-area iPhone */
          .post-viewer-composer {
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
          /* La zone scrollable prend toute la place au-dessus du composer */
          .post-viewer-scroll {
            flex: 1 1 auto !important;
            height: auto !important;
            max-height: none !important;
            padding-bottom: 92px !important; /* espace pour composer fixe */
          }
          /* Média plein cadre */
          .post-viewer-media { min-height: 0 !important; max-height: none !important; height: auto !important; overflow: visible !important; border-radius: 0 !important; }
          .post-viewer-media img, .post-viewer-media video { width: 100% !important; max-width: 100% !important; max-height: none !important; height: auto !important; object-fit: contain !important; }
          .post-viewer-media .pv-video-stage { height: auto !important; max-height: none !important; border-radius: 0 !important; }
          .post-viewer-media .pv-video-stage .pv-video-frame,
          .post-viewer-media .pv-video-stage video {
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            object-fit: contain !important;
          }
          .post-viewer-media .pv-video-stage:focus-visible { outline: none; }
          .post-viewer-media .pv-video-stage:hover .pv-video-play { transform: translate(-50%, -50%) !important; box-shadow: 0 4px 18px rgba(0,0,0,0.4) !important; }
          .post-viewer-job-card { max-height: min(560px, 62dvh); border-radius: 12px; }
          .post-viewer-slider-button { width: 34px; height: 34px; }
          .post-viewer-slider-previous { left: 8px; }
          .post-viewer-slider-next { right: 8px; }
          .pv-stats-row { padding: 8px 12px 6px; font-size: 12.5px; }
          .pv-actions { padding: 2px 4px; }
          .pv-comments-header { padding: 10px 12px 2px; }
          .pv-comments-list { padding: 6px 12px 12px; }
          .post-viewer-comment-input { font-size: 14px !important; }
          .post-share-overlay { padding: 0 !important; align-items: stretch !important; }
          .post-share-modal { width: 100% !important; max-width: none !important; max-height: 100dvh !important; height: 100dvh !important; border-radius: 0 !important; padding-bottom: env(safe-area-inset-bottom); }
          .post-share-modal input, .post-share-modal textarea { font-size: 16px !important; }
          .pv-comment-bubble { border-radius: 16px; }
        }
        @media (max-width: 420px) {
          .post-viewer-header { gap: 6px !important; }
          .post-viewer-author-header > div:first-child { width: 40px !important; height: 40px !important; min-width: 40px !important; }
          .post-viewer-comment-input { padding-right: 110px !important; }
        }
      `}</style>

      {/* ===== CARTE UNIQUE FAÇON FACEBOOK ===== */}
      <div className="post-viewer-card" onClick={(event) => event.stopPropagation()}>

        {/* --- Header : flèche retour (mobile) + titre + croix --- */}
        <div className="post-viewer-header" aria-label={`Publication de ${announcementAuthor}`}>
          <button type="button" className="post-viewer-close pv-back-btn" onClick={onClose} aria-label="Retour">
            <ChevronLeft size={22} />
          </button>
          <div className="post-viewer-header-title pv-header-title-mobile">{isAnnouncement ? "Annonce officielle" : `Publication de ${announcementAuthor}`}</div>
          <button
            className="post-viewer-close"
            type="button"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- Zone scrollable unique : contenu + stats + actions + commentaires --- */}
        <div className="post-viewer-scroll">
          {isAnnouncement && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2F7 100%)", borderBottom: "1px solid var(--app-border)", color: "var(--app-text)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.045em", textTransform: "uppercase", flexShrink: 0 }}>
              <Megaphone size={15} color="#3B82F6" />
              <span>Annonce officielle LynoraLink</span>
            </div>
          )}

          {/* --- En-tête auteur (sticky) --- */}
          <div className="post-viewer-author-header" style={{ padding: "14px 16px 12px", display: "flex", alignItems: "flex-start", gap: 10 }}>
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
                      <Avatar initials={post?.initials || "U"} imgUrl={post?.avatarUrl} size={28} className="post-viewer-author-avatar" />
                    </Link>
                  </ProfileHoverPreview>
                </div>
              </div>
            ) : post?.authorId ? (
              <ProfileHoverPreview type={isPagePost ? "page" : "person"} fallback={{ id: isPagePost ? post?.companyPageId : post?.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, coverUrl: post?.pageCoverUrl || post?.coverUrl, bio: post?.description, location: post?.location, followersCount: post?.followersCount }}>
                <Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(post?.companyPageId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} aria-label={`Voir ${isPagePost ? "la page" : "le profil"} de ${announcementAuthor}`} style={{ display: "inline-flex", flexShrink: 0 }}>
                  <Avatar initials={isAnnouncement ? "LL" : (post?.initials || "U")} imgUrl={announcementAvatar} size={44} className="post-viewer-author-avatar" />
                </Link>
              </ProfileHoverPreview>
            ) : <Avatar initials={isAnnouncement ? "LL" : (post?.initials || "U")} imgUrl={announcementAvatar} size={44} className="post-viewer-author-avatar" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {group ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 7, fontSize: 15.5, fontWeight: 700, color: LI_TEXT }}>
                      <ProfileHoverPreview type="group" entity={group}>
                        <Link href={`/feed?view=groups&groupId=${encodeURIComponent(group.id)}`} style={{ overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}>{group.name}</Link>
                      </ProfileHoverPreview>
                    </div>
                    {isPagePost && !isOwnPage && (
                      <button
                        type="button"
                        onClick={() => onFollowPage?.(post.companyPageId)}
                        disabled={isPageFollowed || !onFollowPage}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 8, border: `1px solid ${LI_BORDER}`, background: "transparent", color: LI_TEXT, fontSize: 11, fontWeight: 800, cursor: isPageFollowed || !onFollowPage ? "default" : "pointer" }}
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
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 7, fontSize: 15.5, fontWeight: 700, color: LI_TEXT }}>
                      {post?.authorId && !isAnnouncement ? <ProfileHoverPreview type={isPagePost ? "page" : "person"} fallback={{ id: isPagePost ? post?.companyPageId : post?.authorId, name: announcementAuthor, avatarUrl: announcementAvatar, coverUrl: post?.pageCoverUrl || post?.coverUrl, bio: post?.description, location: post?.location, followersCount: post?.followersCount }}><Link href={isPagePost ? `/feed?view=company&pageId=${encodeURIComponent(post?.companyPageId || "")}` : `/feed?view=profile&userId=${encodeURIComponent(post.authorId)}`} style={{ overflow: "hidden", textOverflow: "ellipsis", color: "inherit", textDecoration: "none" }}>{announcementAuthor}</Link></ProfileHoverPreview> : <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{announcementAuthor}</span>}
                      {isOfficialPost && <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" />}
                      {!isOfficialPost && post?.isPremium && <PremiumBadge size={14} />}
                    </div>
                    {isPagePost && !isOwnPage && (
                      <button
                        type="button"
                        onClick={() => onFollowPage?.(post.companyPageId)}
                        disabled={isPageFollowed || !onFollowPage}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 8, border: `1px solid ${LI_BORDER}`, background: "transparent", color: LI_TEXT, fontSize: 11, fontWeight: 800, cursor: isPageFollowed || !onFollowPage ? "default" : "pointer" }}
                      >
                        {isPageFollowed ? <><Check size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}
                      </button>
                    )}
                  </div>
                  {followers != null && (
                    <div style={{ fontSize: 13.5, color: LI_SECONDARY, marginTop: 1 }}>{typeof followers === "number" ? `${formatCount(followers)} abonn\u00e9s` : followers}</div>
                  )}
                </>
              )}
              <div style={{ fontSize: 12.5, color: LI_SECONDARY, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
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
                aria-label="Options de la publication"
                aria-expanded={moreMenuOpen}
              >
                <MoreHorizontal size={22} />
              </button>
              {moreMenuOpen && <MoreMenu isOwn={isOwn} onEdit={() => { setMoreMenuOpen(false); }} onDelete={() => { setMoreMenuOpen(false); }} onReport={() => { setMoreMenuOpen(false); }} onCopyLink={() => { navigator.clipboard?.writeText(`${window.location.origin}/feed?post=${post.id}`); setMoreMenuOpen(false); }} onClose={() => setMoreMenuOpen(false)} />}
            </div>
          </div>

          {/* --- Texte / offre d'emploi / sponsorisé / fichier --- */}
          {isFilePostContent ? (
            <>
              <div style={{ padding: "12px 16px 4px" }}>
                <PostText text={post?.text || post?.fileDescription || post?.file?.description || post?.attachment?.description} />
              </div>
              <FileViewerBanner post={post} />
            </>
          ) : isJobPost ? (
            <div className="post-viewer-job-card" style={{ margin: "8px 16px 16px", border: `1px solid ${LI_BORDER}`, borderRadius: 12, overflow: "hidden", background: C.white, boxShadow: "0 5px 16px rgba(15,51,82,0.06)" }}>
              <div style={{ padding: "18px 20px 20px", background: "linear-gradient(135deg, #0F3352 0%, #1B5386 100%)", color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid rgba(246,211,116,.35)", borderRadius: 999, background: "rgba(246,211,116,.12)", color: "#F6D374", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}>
                    <Briefcase size={14} /> {jobType}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.68)", fontWeight: 600 }}>Opportunit\u00e9 professionnelle</span>
                </div>
                <h1 style={{ margin: "14px 0 0", fontSize: 22, lineHeight: 1.2, fontWeight: 800, letterSpacing: "0.01em" }}>{jobTitle}</h1>
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
            <div style={{ padding: "12px 16px" }}>
              <PostText text={post?.headline || post?.text || post?.excerpt} />
            </div>
          )}

          {/* --- Médias (pleine largeur, coins 12px en desktop) --- */}
          {!isSponsoredPost && media.length > 0 && (
            <div style={{ padding: "0 16px 8px" }}>
              <MediaGallery items={media} />
            </div>
          )}

          {/* --- Stats façon Facebook : bulles réactions + compteurs --- */}
          <div className="pv-stats-row">
            {reactionCount > 0 ? (
              <button type="button" className="pv-stats-reactions" aria-label={`${formatCount(reactionCount)} r\u00e9actions`}>
                <span className="pv-stats-bubbles">
                  {engagementReactions.map((r, i) => (
                    <span key={r.key} style={{ background: r.color, zIndex: engagementReactions.length - i }}>
                      <img src={r.src} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                    </span>
                  ))}
                </span>
                <span>{reactionSummary}</span>
              </button>
            ) : <span />}
            <button type="button" className="pv-stats-right" onClick={() => commentInputRef.current?.focus()}>
              {commentsCount > 0 && <span>{commentsCount} commentaire{commentsCount > 1 ? "s" : ""}</span>}
              {repostCount > 0 && <span>&middot; {repostCount} republication{repostCount > 1 ? "s" : ""}</span>}
              {!commentsCount && !repostCount && <span>Aucun commentaire</span>}
            </button>
          </div>

          {/* --- Barre d'actions façon Facebook --- */}
          <div className="pv-actions">
            <ReactionButton reaction={reaction} onReact={handleViewerReaction} onToggleLike={handleViewerLike} />
            <ActionBtn icon={MessageCircle} label="Commenter" onClick={() => commentInputRef.current?.focus()} />
            <ActionBtn icon={Share2} label="Partager" onClick={() => setShareOpen(true)} />
            <ActionBtn icon={Bookmark} label="Enregistrer" active={post?.bookmarked} onClick={() => onToggleBookmark?.(post.id)} />
          </div>

          {/* --- En-tête commentaires (tri façon FB) --- */}
          <div className="pv-comments-header">
            <span className="pv-comments-header-title">Commentaires</span>
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
                aria-expanded={sortOpen}
              >
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

          {/* --- Liste des commentaires --- */}
          <div className="pv-comments-list">
            {(commentsLoading || post?.loadingComments) && (
              <div style={{ width: "100%", padding: "12px 0 4px" }}>
                <CommentSkeleton count={4} />
              </div>
            )}
            {!commentsLoading && !post?.loadingComments && visibleComments.map((comment) => (
              <CommentItem
                key={comment.id}
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
            ))}
            {!commentsLoading && !post?.loadingComments && (hiddenCount > 0 || showAllComments) && (
              <button onClick={() => setShowAllComments((visible) => !visible)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: LINKEDIN_BLUE, padding: "10px 4px", width: "100%", textAlign: "left" }}>
                {showAllComments ? "R\u00e9duire les commentaires" : `Voir les ${hiddenCount} autres commentaires`}
                <ChevronDown size={15} style={{ transform: showAllComments ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
              </button>
            )}
            {!commentsLoading && !post?.loadingComments && userOwnedHiddenCommentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setHiddenCommentIds((current) => current.filter((id) => !userOwnedHiddenCommentIds.includes(id)))}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: LINKEDIN_BLUE, padding: "6px 4px 12px", width: "100%", textAlign: "left" }}
              >
                Réafficher les commentaires masqués
              </button>
            )}
            {!commentsLoading && !post?.loadingComments && comments.length === 0 && (
              <div style={{ padding: "28px 0", textAlign: "center", color: LI_SECONDARY, fontSize: 14 }}>
                {emptyCommentsMessage}
              </div>
            )}
          </div>
        </div>

        {isOwn && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${LI_BORDER}`, background: "linear-gradient(180deg, rgba(15,51,82,0.03) 0%, rgba(15,51,82,0.00) 100%)", flexShrink: 0 }}>
            <button
              type="button"
              onClick={async () => {
                const nextValue = !commentsLocked;
                setCommentsLocked(nextValue);
                try {
                  await persistCommentSettings(nextValue, commentatorsLimit);
                } catch (error) {
                  setCommentsLocked(commentsLocked);
                  console.error("persistCommentSettings", error);
                }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(15,51,82,0.12)", borderRadius: 999, padding: "7px 12px", background: commentsLocked ? "#0F3352" : "#EFF5FB", color: commentsLocked ? C.white : LI_TEXT, cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: "inherit" }}
            >
              <Lock size={14} />
              {commentsLocked ? "Commentaires verrouillés" : "Verrouiller les commentaires"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 12.5, color: LI_SECONDARY, fontWeight: 600 }}>
              <label htmlFor="post-viewer-commentators-limit" style={{ whiteSpace: "nowrap" }}>Limite commentateurs</label>
              <input
                id="post-viewer-commentators-limit"
                type="number"
                min={0}
                step={1}
                value={commentatorsLimit}
                onChange={async (event) => {
                  const value = Number(event.target.value);
                  const nextValue = Number.isFinite(value) && value >= 0 ? value : 0;
                  setCommentatorsLimit(nextValue);
                  try {
                    await persistCommentSettings(commentsLocked, nextValue);
                  } catch (error) {
                    setCommentatorsLimit(commentatorsLimit);
                    console.error("persistCommentSettings", error);
                  }
                }}
                style={{ width: 68, padding: "6px 8px", borderRadius: 8, border: `1px solid ${LI_BORDER}`, background: C.white, color: LI_TEXT, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
              />
            </div>
          </div>
        )}

        {/* --- Composer façon Facebook (sticky bas de carte) --- */}
        <div className="post-viewer-composer">
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <Avatar initials={currentUser?.initials || "VS"} imgUrl={currentUser?.avatarUrl} size={36} />
          </div>
          <div style={{ flex: "1 1 auto", minWidth: 0, position: "relative", width: "auto", maxWidth: "100%" }}>
            {commentingNotice && (
              <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 10, background: commentsLocked ? "rgba(15,51,82,0.06)" : "rgba(217,165,54,0.12)", border: `1px solid ${commentsLocked ? "rgba(15,51,82,0.14)" : "rgba(217,165,54,0.28)"}`, color: LI_TEXT, fontSize: 12.5, fontWeight: 700 }}>
                {commentingNotice}
              </div>
            )}
            {replyingTo && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 12, color: LI_SECONDARY }}>
                <span>R\u00e9ponse \u00e0 <strong>{replyingTo.author}</strong></span>
                <button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 0 }} aria-label="Annuler la r\u00e9ponse"><X size={14} /></button>
              </div>
            )}
            {attachedMedia.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "2px 2px 0" }}>
                {attachedMedia.map((item, index) => (
                  <div key={`${item.url}-${index}`} style={{ position: "relative", padding: 3, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 9 }}>
                    {item.type === "video" ? (
                      <span style={{ position: "relative", display: "block", width: 52, height: 40, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                        <video src={item.url} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                        <span aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.62)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                          <Play size={7} fill="currentColor" strokeWidth={0} />
                        </span>
                      </span>
                    ) : <img src={item.url} alt={item.label || "M\u00e9dia joint"} style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} />}
                    <button type="button" onClick={() => setAttachedMedia((current) => current.filter((_, mediaIndex) => mediaIndex !== index))} style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, border: `2px solid ${C.white}`, borderRadius: "50%", background: C.danger, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} aria-label="Retirer le m\u00e9dia"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="post-viewer-input-row" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 44, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 24, boxSizing: "border-box" }}>
              <input
                ref={commentInputRef}
                value={commentText}
                disabled={isCommentingBlocked}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                placeholder={commentsLocked ? "Commentaires verrouillés" : (isCommentLimitReached ? "Limite de commentateurs atteinte" : "Ajouter un commentaire...")}
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
                  opacity: isCommentingBlocked ? 0.7 : 1,
                }}
              />
              <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 2 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia} aria-label="Ajouter une photo ou une vid\u00e9o" style={{ background: "none", border: "none", cursor: uploadingMedia ? "default" : "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%", opacity: uploadingMedia ? 0.5 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <ImageIcon size={17} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple onChange={handleMediaSelect} style={{ display: "none" }} />
                <button type="button" onClick={() => setShowEmoji((current) => !current)} disabled={isCommentingBlocked} aria-label="Ajouter un emoji" style={{ background: "none", border: "none", cursor: isCommentingBlocked ? "default" : "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%", opacity: isCommentingBlocked ? 0.5 : 1 }} onMouseEnter={(e) => { if (!isCommentingBlocked) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Smile size={17} />
                </button>
                <button type="button" onClick={handleCommentSubmit} disabled={(!commentText.trim() && !attachedMedia.length) || uploadingMedia || isCommentingBlocked} aria-label="Envoyer le commentaire" style={{ width: 28, height: 28, border: "none", borderRadius: "50%", background: (commentText.trim() || attachedMedia.length) && !uploadingMedia && !isCommentingBlocked ? C.navy800 : C.line, color: C.white, cursor: (commentText.trim() || attachedMedia.length) && !uploadingMedia && !isCommentingBlocked ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: isCommentingBlocked ? 0.55 : 1 }}>
                  <Send size={13} />
                </button>
              </div>
              {showEmoji && <div className="emoji-picker-popover" style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 44, zIndex: 20 }}><Emojipicker emojis={["\ud83d\udc4d", "\u2764\ufe0f", "\ud83d\ude02", "\ud83d\ude2e", "\ud83d\ude22", "\ud83d\ude4f", "\ud83c\udf89", "\ud83d\udd25", "\ud83d\udc4f", "\ud83d\udca1"]} onSelect={(emoji) => { setCommentText((current) => `${current}${emoji}`); setShowEmoji(false); }} size={30} /></div>}
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
